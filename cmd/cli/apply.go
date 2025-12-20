// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")

package cli

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"

	"github.com/kubegraf/kubegraf/internal/cli"
	"github.com/spf13/cobra"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
)

var (
	applyNamespace   string
	applyContext     string
	applyServerSide  bool
	applyFieldManager string
	applyFile        string
)

var applyCmd = &cobra.Command{
	Use:   "apply -f <file>",
	Short: "Apply a configuration to a resource from a file",
	Long: `Apply a configuration to a resource from a YAML file.

Supports multi-document YAML files (separated by ---).

Examples:
  # Apply a configuration from a file
  kubegraf apply -f deployment.yaml

  # Use server-side apply
  kubegraf apply -f deployment.yaml --server-side

  # Specify a custom field manager
  kubegraf apply -f deployment.yaml --field-manager my-tool

  # Use a different namespace (overrides namespace in YAML)
  kubegraf apply -f deployment.yaml --ns production

  # Use a different context
  kubegraf apply -f deployment.yaml --context prod-cluster`,
	RunE: runApply,
}

func init() {
	applyCmd.Flags().StringVarP(&applyFile, "filename", "f", "", "YAML file to apply (required)")
	applyCmd.Flags().StringVarP(&applyNamespace, "namespace", "n", "", "Override namespace")
	applyCmd.Flags().StringVarP(&applyContext, "context", "c", "", "Kubernetes context")
	applyCmd.Flags().BoolVar(&applyServerSide, "server-side", false, "Use server-side apply")
	applyCmd.Flags().StringVar(&applyFieldManager, "field-manager", "kubegraf", "Field manager name for server-side apply")
	applyCmd.MarkFlagRequired("filename")
}

func runApply(cmd *cobra.Command, args []string) error {
	// Load kubeconfig
	kubeConfig, err := cli.LoadKubeConfig(applyContext, applyNamespace)
	if err != nil {
		return fmt.Errorf("load kubeconfig: %w", err)
	}

	kubeConfig.PrintContextInfo()
	fmt.Println()

	// Read file
	data, err := os.ReadFile(applyFile)
	if err != nil {
		return fmt.Errorf("read file: %w", err)
	}

	// Parse multi-document YAML
	decoder := yaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), 4096)
	objects := []unstructured.Unstructured{}

	for {
		var obj unstructured.Unstructured
		if err := decoder.Decode(&obj); err != nil {
			if err == io.EOF {
				break
			}
			return fmt.Errorf("decode YAML: %w", err)
		}

		if len(obj.Object) == 0 {
			continue
		}

		objects = append(objects, obj)
	}

	if len(objects) == 0 {
		return fmt.Errorf("no valid objects found in %s", applyFile)
	}

	fmt.Printf("Found %d object(s) in %s\n\n", len(objects), applyFile)

	// Apply each object
	ctx := context.Background()
	restConfig := kubeConfig.GetRESTConfig()
	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("create dynamic client: %w", err)
	}

	// Create discovery client for RESTMapper
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("create discovery client: %w", err)
	}

	groupResources, err := restmapper.GetAPIGroupResources(discoveryClient)
	if err != nil {
		return fmt.Errorf("get API group resources: %w", err)
	}

	mapper := restmapper.NewDiscoveryRESTMapper(groupResources)

	for _, obj := range objects {
		if err := applyObject(ctx, &obj, dynamicClient, mapper, restConfig, kubeConfig.GetNamespace()); err != nil {
			fmt.Printf("❌ Error applying %s/%s: %v\n", obj.GetKind(), obj.GetName(), err)
			continue
		}
	}

	return nil
}

func applyObject(ctx context.Context, obj *unstructured.Unstructured, dynamicClient dynamic.Interface, mapper meta.RESTMapper, restConfig *rest.Config, defaultNamespace string) error {
	// Set namespace if not specified
	namespace := obj.GetNamespace()
	if namespace == "" {
		if applyNamespace != "" {
			namespace = applyNamespace
		} else {
			namespace = defaultNamespace
		}
		obj.SetNamespace(namespace)
	}

	// Get GVK
	gvk := obj.GroupVersionKind()
	if gvk.Empty() {
		return fmt.Errorf("object has no kind/apiVersion")
	}

	// Map GVK to GVR
	mapping, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if err != nil {
		return fmt.Errorf("find resource mapping: %w", err)
	}

	// Get resource client
	var resourceClient dynamic.ResourceInterface
	if mapping.Scope.Name() == meta.RESTScopeNameNamespace {
		resourceClient = dynamicClient.Resource(mapping.Resource).Namespace(namespace)
	} else {
		resourceClient = dynamicClient.Resource(mapping.Resource)
	}

	name := obj.GetName()
	kind := obj.GetKind()

	if applyServerSide {
		// Server-side apply
		data, err := runtime.Encode(unstructured.UnstructuredJSONScheme, obj)
		if err != nil {
			return fmt.Errorf("encode object: %w", err)
		}

		_, err = resourceClient.Patch(
			ctx,
			name,
			types.ApplyPatchType,
			data,
			metav1.PatchOptions{
				FieldManager: applyFieldManager,
			},
		)
		if err != nil {
			return fmt.Errorf("server-side apply: %w", err)
		}

		nsInfo := ""
		if namespace != "" {
			nsInfo = fmt.Sprintf(" (ns=%s)", namespace)
		}
		fmt.Printf("✓ Applied %s/%s%s (server-side)\n", kind, name, nsInfo)
	} else {
		// Client-side apply (create or update)
		_, err := resourceClient.Get(ctx, name, metav1.GetOptions{})
		if errors.IsNotFound(err) {
			// Create
			_, err = resourceClient.Create(ctx, obj, metav1.CreateOptions{})
			if err != nil {
				return fmt.Errorf("create: %w", err)
			}

			nsInfo := ""
			if namespace != "" {
				nsInfo = fmt.Sprintf(" (ns=%s)", namespace)
			}
			fmt.Printf("✓ Created %s/%s%s\n", kind, name, nsInfo)
		} else if err != nil {
			return fmt.Errorf("get: %w", err)
		} else {
			// Update
			_, err = resourceClient.Update(ctx, obj, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("update: %w", err)
			}

			nsInfo := ""
			if namespace != "" {
				nsInfo = fmt.Sprintf(" (ns=%s)", namespace)
			}
			fmt.Printf("✓ Updated %s/%s%s\n", kind, name, nsInfo)
		}
	}

	return nil
}

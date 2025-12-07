# Third-Party Dependencies

KubeGraf uses the following open source libraries. We are grateful to the developers and maintainers of these projects.

## Direct Dependencies

### UI and Terminal Libraries

| Package | Version | License | Repository |
|---------|---------|---------|------------|
| github.com/rivo/tview | v0.0.0-20240307173318-e804876934a1 | MIT | https://github.com/rivo/tview |
| github.com/gdamore/tcell/v2 | v2.7.1 | Apache 2.0 | https://github.com/gdamore/tcell |
| github.com/fatih/color | v1.18.0 | MIT | https://github.com/fatih/color |

### Kubernetes Client Libraries

| Package | Version | License | Repository |
|---------|---------|---------|------------|
| k8s.io/client-go | v0.34.2 | Apache 2.0 | https://github.com/kubernetes/client-go |
| k8s.io/api | v0.34.2 | Apache 2.0 | https://github.com/kubernetes/api |
| k8s.io/apimachinery | v0.34.2 | Apache 2.0 | https://github.com/kubernetes/apimachinery |
| k8s.io/metrics | v0.34.2 | Apache 2.0 | https://github.com/kubernetes/metrics |

### Data Serialization

| Package | Version | License | Repository |
|---------|---------|---------|------------|
| gopkg.in/yaml.v2 | v2.4.0 | Apache 2.0 / MIT | https://github.com/go-yaml/yaml |

## License Compatibility

All dependencies use licenses that are compatible with Apache License 2.0:

- **MIT License**: Permissive license compatible with Apache 2.0
- **Apache License 2.0**: Same license as KubeGraf

## License Texts

Full license texts for all dependencies can be found in their respective repositories:

- [tview MIT License](https://github.com/rivo/tview/blob/master/LICENSE.txt)
- [tcell Apache 2.0 License](https://github.com/gdamore/tcell/blob/main/LICENSE)
- [fatih/color MIT License](https://github.com/fatih/color/blob/main/LICENSE.md)
- [Kubernetes Apache 2.0 License](https://github.com/kubernetes/client-go/blob/master/LICENSE)
- [gopkg.in/yaml.v2 License](https://github.com/go-yaml/yaml/blob/v2/LICENSE)

## Attribution

We acknowledge and are grateful to these developers for their contributions to open source:

- **tview** - Created by Trevor Rosen and contributors
- **tcell** - Created by Garrett D'Amore and contributors
- **fatih/color** - Created by Fatih Arslan
- **Kubernetes** - Created by The Kubernetes Authors
- **gopkg.in/yaml.v2** - Created by Canonical Ltd. and contributors

## Indirect Dependencies

For a complete list of all transitive dependencies, see [go.mod](go.mod) and [go.sum](go.sum).

All indirect dependencies are also licensed under Apache 2.0, MIT, or BSD licenses, ensuring full compatibility.

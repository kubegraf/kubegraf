; KubeGraf Windows Installer Script for Inno Setup
; Download Inno Setup from: https://jrsoftware.org/isdl.php

#define AppName "KubeGraf"
#define AppVersion "1.0.0"
#define AppPublisher "KubeGraf Team"
#define AppURL "https://kubegraf.io"
#define AppExeName "kubegraf.exe"
#define AppDescription "Intelligent Kubernetes Control Center"

[Setup]
; Basic app information
AppId={{8B5C9F6A-3D2E-4F1B-9A8C-7E6D5C4B3A21}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}/docs
AppUpdatesURL={#AppURL}/releases
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
LicenseFile=..\..\LICENSE
OutputDir=..\..\dist\windows
OutputBaseFilename=kubegraf-{#AppVersion}-setup
SetupIconFile=kubegraf.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64

; Signing (optional - requires code signing certificate)
; SignTool=signtool
; SignedUninstaller=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "addtopath"; Description: "Add KubeGraf to PATH (required for 'kubegraf' command in terminal)"; GroupDescription: "System Configuration:"; Flags: checkedonce

[Files]
; Main executable (you'll need to download this from GitHub releases)
Source: "kubegraf.exe"; DestDir: "{app}"; Flags: ignoreversion
; Optional: Include README or other docs
; Source: "README.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Parameters: "web"; Comment: "Launch {#AppName} Web Dashboard"
Name: "{group}\{#AppName} Terminal"; Filename: "cmd.exe"; Parameters: "/k ""{app}\{#AppExeName}"""; Comment: "Launch {#AppName} in Terminal"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Parameters: "web"; Tasks: desktopicon; Comment: "Launch {#AppName} Web Dashboard"

[Run]
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent; Parameters: "web"

[Code]
const
    EnvironmentKey = 'Environment';

procedure EnvAddPath(InstallPath: string);
var
    Paths: string;
begin
    { Retrieve current path (use empty string if entry not exists) }
    if not RegQueryStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths) then
        Paths := '';

    { Skip if already in path }
    if Pos(';' + InstallPath + ';', ';' + Paths + ';') > 0 then exit;

    { Add InstallPath to the end of the path variable }
    if Paths = '' then
        Paths := InstallPath
    else
        Paths := Paths + ';' + InstallPath;

    { Overwrite path with new value (includes install path) }
    if RegWriteStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths) then
    begin
        Log('The [' + InstallPath + '] directory was added to PATH');
    end
    else
    begin
        Log('Error: Failed to add [' + InstallPath + '] to PATH');
    end;
end;

procedure EnvRemovePath(InstallPath: string);
var
    Paths: string;
    P: Integer;
begin
    { Retrieve current path }
    if not RegQueryStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths) then
    begin
        Log('Error: PATH not found');
        exit;
    end;

    { Skip if not in path }
    P := Pos(';' + InstallPath + ';', ';' + Paths + ';');
    if P = 0 then exit;

    { Update path string }
    Delete(Paths, P - 1, Length(InstallPath) + 1);

    { Overwrite path with new value }
    if RegWriteStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths) then
    begin
        Log('The [' + InstallPath + '] directory was removed from PATH');
    end
    else
    begin
        Log('Error: Failed to remove [' + InstallPath + '] from PATH');
    end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
    if (CurStep = ssPostInstall) and WizardIsTaskSelected('addtopath') then
        EnvAddPath(ExpandConstant('{app}'));
end;

procedure DeinitializeSetup();
var
    ResultCode: Integer;
begin
    if WizardIsTaskSelected('addtopath') then
    begin
        MsgBox('KubeGraf has been added to your PATH.' + #13#10 + #13#10 +
               'IMPORTANT: To use "kubegraf" command in terminal, please:' + #13#10 +
               '1. Close any open Command Prompt or PowerShell windows' + #13#10 +
               '2. Open a NEW terminal window' + #13#10 +
               '3. Type: kubegraf web' + #13#10 + #13#10 +
               'The PATH changes only apply to new terminal sessions.',
               mbInformation, MB_OK);
    end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
    if CurUninstallStep = usPostUninstall then
        EnvRemovePath(ExpandConstant('{app}'));
end;

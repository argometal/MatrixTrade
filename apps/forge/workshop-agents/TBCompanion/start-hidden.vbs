' Runs TBC without a visible console. Prefers runtime\node\node.exe next to this script.
' After a short delay, opens the companion UI in the default browser (no manual URL).
Option Explicit

Const HIDDEN_WINDOW = 0

Dim fso, sh, root, nodeExe, serverJs, cmd, port, url

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

root = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = root & "\runtime\node\node.exe"
serverJs = root & "\server.js"

If Not fso.FileExists(nodeExe) Then
  nodeExe = sh.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe")
End If
If Not fso.FileExists(nodeExe) Then
  nodeExe = "node"
End If

If Not fso.FileExists(serverJs) Then
  MsgBox "Missing server.js at:" & vbCrLf & serverJs, vbCritical, "TBC"
  WScript.Quit 1
End If

port = ResolvePort(root, sh)
url = "http://127.0.0.1:" & port & "/"

sh.CurrentDirectory = root
cmd = """" & nodeExe & """ """ & serverJs & """"
sh.Run cmd, HIDDEN_WINDOW, False

' Let Node bind the port before opening the browser.
WScript.Sleep 2200
On Error Resume Next
sh.Run url, 1, False
On Error GoTo 0

Function ResolvePort(rootPath, shell)
  Dim envPort
  ResolvePort = "4010"
  On Error Resume Next
  envPort = Trim(shell.Environment("PROCESS")("TBC_PORT"))
  On Error GoTo 0
  If envPort <> "" And IsNumeric(envPort) Then
    ResolvePort = CStr(CLng(envPort))
    Exit Function
  End If
  ResolvePort = ReadPortFromConfig(rootPath)
End Function

Function ReadPortFromConfig(rootPath)
  Dim cfgPath, ts, txt, re, m
  ReadPortFromConfig = "4010"
  cfgPath = rootPath & "\tbc.config.json"
  If Not fso.FileExists(cfgPath) Then Exit Function
  On Error Resume Next
  Set ts = fso.OpenTextFile(cfgPath, 1, False, -2)
  txt = ts.ReadAll
  ts.Close
  On Error GoTo 0
  Set re = New RegExp
  re.Pattern = """port""\s*:\s*([0-9]+)"
  re.Global = False
  re.IgnoreCase = True
  Set m = re.Execute(txt)
  If m.Count > 0 Then
    If m(0).SubMatches.Count > 0 Then
      If IsNumeric(m(0).SubMatches(0)) Then ReadPortFromConfig = CStr(CLng(m(0).SubMatches(0)))
    End If
  End If
End Function

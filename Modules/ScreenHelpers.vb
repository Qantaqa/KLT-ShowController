Imports System.Text.RegularExpressions

Module ScreenHelpers
    ' Keeps your existing call: MoveAndMaximizeForm(cbMonitorControl.Text)
    Public Sub MoveAndMaximizeForm(target As String)
        ' Default-instance of FrmMain is used consistently elsewhere
        If FrmMain Is Nothing OrElse FrmMain.IsDisposed Then Return
        MoveAndMaximizeForm(FrmMain, target)
    End Sub

    ' Core implementation (can be reused for other forms if needed)
    Public Sub MoveAndMaximizeForm(form As Form, target As String)
        If form Is Nothing OrElse form.IsDisposed Then Return

        Dim all = Screen.AllScreens
        If all Is Nothing OrElse all.Length = 0 Then Return

        Dim targetScreen As Screen = Screen.PrimaryScreen

        ' Accept "Output 1/2/3" (1-based), or try to match by device name
        Dim m = Regex.Match(If(target, "").Trim(), "Output\s*(\d+)", RegexOptions.IgnoreCase)
        If m.Success Then
            Dim idx As Integer = Math.Max(0, Math.Min(all.Length - 1, CInt(m.Groups(1).Value) - 1))
            targetScreen = all(idx)
        Else
            ' Fallback: match on device name (contains)
            Dim wanted = target.Trim()
            Dim byName = all.FirstOrDefault(Function(s) s.DeviceName.IndexOf(wanted, StringComparison.OrdinalIgnoreCase) >= 0)
            If byName IsNot Nothing Then targetScreen = byName
        End If

        ' Move on UI thread if needed
        If form.InvokeRequired Then
            form.BeginInvoke(Sub() ApplyMove(form, targetScreen))
        Else
            ApplyMove(form, targetScreen)
        End If
    End Sub

    Private Sub ApplyMove(form As Form, targetScreen As Screen)
        Try
            form.SuspendLayout()
            ' Normalize first so bounds take effect
            If form.WindowState <> FormWindowState.Normal Then
                form.WindowState = FormWindowState.Normal
            End If

            form.StartPosition = FormStartPosition.Manual
            form.Location = targetScreen.WorkingArea.Location
            form.Size = targetScreen.WorkingArea.Size

            ' Maximize to fill the chosen screen
            form.WindowState = FormWindowState.Maximized
            form.BringToFront()
            form.Activate()
        Finally
            form.ResumeLayout()
        End Try
    End Sub
End Module
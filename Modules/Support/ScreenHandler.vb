Imports System.Text.RegularExpressions

Module ScreenHandler
    ' Track previous monitor states
    Private ConnectAtLaunch As Boolean = True
    Private wasPrimaryOnline As Boolean = False
    Private wasSecondairyOnline As Boolean = False

    Public Sub UpdateMonitorStatusIndicators(ByVal cbMonitorControl As ComboBox, ByVal cbMonitorPrimary As ComboBox, ByVal cbMonitorSecond As ComboBox)
        Dim primaryScreenDetected As Boolean = False
        Dim secondaryScreenDetected As Boolean = False
        Dim controlScreenDetected As Boolean = False

        ' Check if each screen is detected based on the ComboBox values
        If cbMonitorPrimary.SelectedItem IsNot Nothing Then
            If ((cbMonitorPrimary.SelectedItem.ToString().ToLower() = "output 1" And Screen.AllScreens.Length >= 1) Or
                (cbMonitorPrimary.SelectedItem.ToString().ToLower() = "output 2" And Screen.AllScreens.Length >= 2) Or
                (cbMonitorPrimary.SelectedItem.ToString().ToLower() = "output 3" And Screen.AllScreens.Length >= 3)) Then
                primaryScreenDetected = True
            End If
        End If

        If cbMonitorSecond.SelectedItem IsNot Nothing Then
            If ((cbMonitorSecond.SelectedItem.ToString().ToLower() = "output 1" And Screen.AllScreens.Length >= 1) Or
                (cbMonitorSecond.SelectedItem.ToString().ToLower() = "output 2" And Screen.AllScreens.Length >= 2) Or
                (cbMonitorSecond.SelectedItem.ToString().ToLower() = "output 3" And Screen.AllScreens.Length >= 3)) Then
                secondaryScreenDetected = True
            End If
        End If

        If cbMonitorControl.SelectedItem IsNot Nothing Then
            If ((cbMonitorControl.SelectedItem.ToString().ToLower() = "output 1" And Screen.AllScreens.Length >= 1) Or
                (cbMonitorControl.SelectedItem.ToString().ToLower() = "output 2" And Screen.AllScreens.Length >= 2) Or
                (cbMonitorControl.SelectedItem.ToString().ToLower() = "output 3" And Screen.AllScreens.Length >= 3)) Then
                controlScreenDetected = True
            End If
        End If

        ' Update the PictureBoxes based on the detection results
        UpdatePictureBox(FrmMain.pbPrimaryStatus, primaryScreenDetected)
        UpdatePictureBox(FrmMain.pbSecondaryStatus, secondaryScreenDetected)
        UpdatePictureBox(FrmMain.pbControlStatus, controlScreenDetected)

        ' Detect offline/online transitions and show reconnect buttons, with flash messages
        If wasPrimaryOnline AndAlso Not primaryScreenDetected Then
            FrmMain.btn_ReconnectPrimaryBeamer.Visible = True
            ToonFlashBericht("Primary beamer disconnected.", 10, FlashSeverity.IsWarning)
            FrmMain.warning_PrimaryBeamerOffline.Visible = True
            FrmMain.WMP_PrimaryPlayer_Preview.Visible = False

        ElseIf Not wasPrimaryOnline AndAlso primaryScreenDetected Then
            FrmMain.btn_ReconnectPrimaryBeamer.Visible = False
            ToonFlashBericht("Primary beamer reconnected.", 5, FlashSeverity.IsInfo)
            FrmMain.warning_PrimaryBeamerOffline.Visible = False
            FrmMain.WMP_PrimaryPlayer_Preview.Visible = True

        End If
        wasPrimaryOnline = primaryScreenDetected

        If wasSecondairyOnline AndAlso Not secondaryScreenDetected Then
            FrmMain.btn_ReconnectSecondairyBeamer.Visible = True

            FrmMain.warning_SecondairyBeamerOffline.Visible = True
            FrmMain.WMP_SecondairyPlayer_Preview.Visible = False
            If (ConnectAtLaunch) Then
                ConnectAtLaunch = False
            Else
                ToonFlashBericht("Secondary beamer disconnected.", 10, FlashSeverity.IsWarning)
            End If

        ElseIf Not wasSecondairyOnline AndAlso secondaryScreenDetected Then
            FrmMain.btn_ReconnectSecondairyBeamer.Visible = False
            ToonFlashBericht("Secondary beamer reconnected.", 5, FlashSeverity.IsInfo)
            FrmMain.warning_SecondairyBeamerOffline.Visible = False
            FrmMain.WMP_SecondairyPlayer_Preview.Visible = True
        End If
        wasSecondairyOnline = secondaryScreenDetected
    End Sub

    Private Sub UpdatePictureBox(pictureBox As PictureBox, screenDetected As Boolean)
        If screenDetected Then
            pictureBox.Image = My.Resources.iconGreenBullet1
        Else
            pictureBox.Image = My.Resources.iconRedBullet1
        End If
    End Sub


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

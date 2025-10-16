Imports System.IO

Module BeamerHandler

    Dim PrimaryBeamer_Width As Integer = 0
    Dim PrimaryBeamer_Height As Integer = 0
    Dim PrimaryBeamer_PositionX As Integer = 0
    Dim PrimaryBeamer_PositionY As Integer = 0

    Dim SecondairyBeamer_Width As Integer = 0
    Dim SecondairyBeamer_Height As Integer = 0
    Dim SecondairyBeamer_PositionX As Integer = 0
    Dim SecondairyBeamer_PositionY As Integer = 0

    Public Sub SyncPrimaryPlayerPreviewToLive()
        ' Only copy supported properties
        Beamer_Primary.WMP_PrimaryPlayer_Live.settings.volume = FrmMain.WMP_PrimaryPlayer_Preview.settings.volume
        Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.currentPosition = FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.currentPosition
        ' Add more property synchronizations as needed, but only those supported by AxWindowsMediaPlayer
    End Sub


    Public Sub ApplyRowToBeamer(CurrentRow As DataGridViewRow)
        If CurrentRow Is Nothing Then Exit Sub


        ' Determine which beamer to use based on fixture/device info
        Dim fixtureValue As String = ""
        If CurrentRow.Cells("colFixture").Value IsNot Nothing Then
            fixtureValue = CurrentRow.Cells("colFixture").Value.ToString()
        End If
        Dim usePrimary As Boolean = Not (fixtureValue.ToLower.Contains("secondairy"))

        If usePrimary Then
            ' turn primary video stream off
            Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.stop()
            FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.stop()
        Else
            ' Turn secondaire video stream off
            Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.stop()
            FrmMain.WMP_SecondairyPlayer_Preview.Ctlcontrols.stop()
        End If

        ' Check state of beamer
        Dim stateBeamer As Boolean = False
        If CurrentRow.Cells("colStateOnOff").Value IsNot Nothing Then
            Boolean.TryParse(CurrentRow.Cells("colStateOnOff").Value.ToString(), stateBeamer)
        End If

        If stateBeamer = False Then
            ' do not start anything else. We already stopped the previous stream
            Exit Sub
        End If


        ' Get video file
        Dim videoFile As String = ""
        If CurrentRow.Cells("colFilename").Value IsNot Nothing Then
            videoFile = CurrentRow.Cells("colFilename").Value.ToString()
        End If
        If String.IsNullOrWhiteSpace(videoFile) OrElse Not IO.File.Exists(videoFile) Then
            ToonFlashBericht("Video source " & videoFile.ToString & " bestaat niet. ", 10, FlashSeverity.IsError)
            Exit Sub
        End If


        ' Check repeat option
        Dim repeatEnabled As Boolean = False
        If CurrentRow.Cells("colRepeat").Value IsNot Nothing Then
            Boolean.TryParse(CurrentRow.Cells("colRepeat").Value.ToString(), repeatEnabled)
        End If

        ' Check volume option
        Dim volumeEnabled As Boolean = False
        If CurrentRow.Cells("colSound").Value IsNot Nothing Then
            Boolean.TryParse(CurrentRow.Cells("colSound").Value.ToString(), volumeEnabled)
        End If


        ' Get the beamer and its live WMP control
        If usePrimary Then
            ' Ensure fullscreen and scaling 
            Beamer_Primary.WindowState = FormWindowState.Normal
            Beamer_Primary.Location = New Point(PrimaryBeamer_PositionX, PrimaryBeamer_PositionY)
            Beamer_Primary.Size = New Size(PrimaryBeamer_Width, PrimaryBeamer_Height)

            Beamer_Primary.WMP_PrimaryPlayer_Live.Dock = DockStyle.Fill
            Beamer_Primary.WMP_PrimaryPlayer_Live.uiMode = "None"
            Beamer_Primary.WMP_PrimaryPlayer_Live.stretchToFit = True

            ' Set repeat mode
            Beamer_Primary.WMP_PrimaryPlayer_Live.settings.setMode("loop", repeatEnabled)
            FrmMain.WMP_PrimaryPlayer_Preview.settings.setMode("loop", repeatEnabled)

            ' Set volume
            If volumeEnabled Then
                Beamer_Primary.WMP_PrimaryPlayer_Live.settings.volume = 100
            Else
                Beamer_Primary.WMP_PrimaryPlayer_Live.settings.volume = 0
            End If
            ' Load and play video
            Beamer_Primary.WMP_PrimaryPlayer_Live.URL = videoFile
            FrmMain.WMP_PrimaryPlayer_Preview.URL = videoFile

            Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.stop()
            Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.play()

            FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.stop()
            FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.play()
        Else
            Beamer_Secondairy.WindowState = FormWindowState.Normal

            Beamer_Secondairy.Location = New Point(SecondairyBeamer_PositionX, SecondairyBeamer_PositionY)
            Beamer_Secondairy.Size = New Size(SecondairyBeamer_Width, SecondairyBeamer_Height)

            Beamer_Secondairy.WMP_SecondairyPlayer_Live.Dock = DockStyle.Fill
            Beamer_Secondairy.WMP_SecondairyPlayer_Live.uiMode = "None"
            Beamer_Secondairy.WMP_SecondairyPlayer_Live.stretchToFit = True

            ' Set repeat mode
            Beamer_Secondairy.WMP_SecondairyPlayer_Live.settings.setMode("loop", repeatEnabled)
            FrmMain.WMP_SecondairyPlayer_Preview.settings.setMode("loop", repeatEnabled)

            ' Set volume
            If volumeEnabled Then
                Beamer_Secondairy.WMP_SecondairyPlayer_Live.settings.volume = 100
            Else
                Beamer_Secondairy.WMP_SecondairyPlayer_Live.settings.volume = 0
            End If

            ' Load and play video


            Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.stop()
            Beamer_Secondairy.WMP_SecondairyPlayer_Live.URL = videoFile
            Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.play()

            FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.stop()
            FrmMain.WMP_SecondairyPlayer_Preview.URL = videoFile
            FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.play()
        End If

        FrmMain.btnStopLoopingAtEndOfVideo.Visible = True
        FrmMain.Refresh()
    End Sub


    Public Sub SetPrimaryBeamerToCorrectOutput()
        Dim ScreenNr As Integer = 0
        Dim SelectedValue As String = My.Settings.MonitorPrimary

        Select Case (SelectedValue)
            Case "Output 1"
                ScreenNr = 0
            Case "Output 2"
                ScreenNr = 1
            Case "Output 3"
                ScreenNr = 2
        End Select

        PrimaryBeamer_Height = Screen.AllScreens(ScreenNr).Bounds.Height
        PrimaryBeamer_Width = Screen.AllScreens(ScreenNr).Bounds.Width
        PrimaryBeamer_PositionX = Screen.AllScreens(ScreenNr).Bounds.X
        PrimaryBeamer_PositionY = Screen.AllScreens(ScreenNr).Bounds.Y


        ' Set the size and position of the primary beamer
        Beamer_Primary.Location = New Point(PrimaryBeamer_PositionX, PrimaryBeamer_PositionY)
        Beamer_Primary.Size = New Size(PrimaryBeamer_Width, PrimaryBeamer_Height)

        Beamer_Primary.WMP_PrimaryPlayer_Live.uiMode = "None"


        ' Turn of the sound for both preview players
        FrmMain.WMP_PrimaryPlayer_Preview.settings.mute = True

    End Sub

    Public Sub SetSecondairyBeamerToCorrectOutput()
        Dim ScreenNr As Integer = 0
        Dim SelectedValue As String = My.Settings.MonitorSecond


        Select Case (SelectedValue)
            Case "Output 1"
                ScreenNr = 0
            Case "Output 2"
                ScreenNr = 1
            Case "Output 3"
                ScreenNr = 2
        End Select

        SecondairyBeamer_Height = Screen.AllScreens(ScreenNr).Bounds.Height
        SecondairyBeamer_Width = Screen.AllScreens(ScreenNr).Bounds.Width
        SecondairyBeamer_PositionX = Screen.AllScreens(ScreenNr).Bounds.X
        SecondairyBeamer_PositionY = Screen.AllScreens(ScreenNr).Bounds.Y

        ' Set the size and position of the primary beamer
        Beamer_Secondairy.Location = New Point(SecondairyBeamer_PositionX, SecondairyBeamer_PositionY)
        Beamer_Secondairy.Size = New Size(SecondairyBeamer_Width, SecondairyBeamer_Height)

        Beamer_Secondairy.WMP_SecondairyPlayer_Live.uiMode = "None"
        FrmMain.WMP_SecondairyPlayer_Preview.settings.mute = True

    End Sub



End Module

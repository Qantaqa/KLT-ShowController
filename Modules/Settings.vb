Module Settings
    Public Function ImagesAreEqual(img1 As Image, img2 As Image) As Boolean
        If img1 Is Nothing OrElse img2 Is Nothing Then Return False
        If img1.Size <> img2.Size Then Return False
        If img1.PixelFormat <> img2.PixelFormat Then Return False

        Using ms1 As New IO.MemoryStream(), ms2 As New IO.MemoryStream()
            img1.Save(ms1, Imaging.ImageFormat.Png)
            img2.Save(ms2, Imaging.ImageFormat.Png)
            Dim bytes1 = ms1.ToArray()
            Dim bytes2 = ms2.ToArray()
            Return bytes1.SequenceEqual(bytes2)
        End Using
    End Function

    Public Sub MoveAndMaximizeForm_OLD(outputValue As String)
        Dim screenToUse As Screen = Nothing

        Select Case outputValue.ToLower()
            Case "output 1"
                screenToUse = Screen.AllScreens(0) 'First screen
            Case "output 2"
                If Screen.AllScreens.Length > 1 Then
                    screenToUse = Screen.AllScreens(1) 'Second screen, if available
                Else
                    screenToUse = Screen.AllScreens(0) 'Default to first screen if second not found
                End If
            Case "output 3"
                If Screen.AllScreens.Length > 2 Then
                    screenToUse = Screen.AllScreens(2) 'Third screen, if available
                ElseIf Screen.AllScreens.Length > 1 Then
                    screenToUse = Screen.AllScreens(1) 'Default to second screen if third not found
                Else
                    screenToUse = Screen.AllScreens(0) 'Default to first screen if second and third not found
                End If
            Case Else
                'Handle invalid input (e.g., default to the primary screen)
                screenToUse = Screen.PrimaryScreen
        End Select

        If screenToUse IsNot Nothing Then
            FrmMain.StartPosition = FormStartPosition.Manual
            FrmMain.Location = screenToUse.WorkingArea.Location 'Top-left of the screen's working area
            FrmMain.WindowState = FormWindowState.Maximized 'Maximize the window
            FrmMain.Show() 'Ensure the form is shown.
        Else
            MessageBox.Show("Could not determine the correct screen.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End If

    End Sub

    Public Sub UpdateCurrentTime()
        FrmMain.lblCurrentTime.Text = DateTime.Now.ToString("HH:mm:ss")
    End Sub

    Public Sub Update_LockUnlocked(State As String)
        FrmMain.btnLockUnlocked.Text = State
        If State = "Locked" Then
            My.Settings.Locked = True

            FrmMain.btnLockUnlocked.Text = "Locked"
            FrmMain.btnLockUnlocked.Image = My.Resources.iconLocked

            FrmMain.btnLoadAll.Enabled = False
            FrmMain.btnSaveShow.Enabled = False
            FrmMain.btn_DGGrid_AddNewRowBefore.Enabled = False
            FrmMain.btn_DGGrid_AddNewRowAfter.Enabled = False
            FrmMain.btn_DGGrid_RemoveCurrentRow.Enabled = False
            FrmMain.DG_Show.ReadOnly = True

            FrmMain.DG_Show.SelectionMode = DataGridViewSelectionMode.FullRowSelect

            FrmMain.gb_DetailWLed.Enabled = False

            FrmMain.DG_Devices.ReadOnly = True
            FrmMain.btnAddDevice.Enabled = False
            FrmMain.btnDeleteDevice.Enabled = False

        Else
            My.Settings.Locked = False
            FrmMain.btnLockUnlocked.Text = "Unlocked"
            FrmMain.btnLockUnlocked.Image = My.Resources.iconUnlocked_Green

            FrmMain.btnLoadAll.Enabled = True
            FrmMain.btnSaveShow.Enabled = True
            FrmMain.btn_DGGrid_AddNewRowBefore.Enabled = True
            FrmMain.btn_DGGrid_AddNewRowAfter.Enabled = True
            FrmMain.btn_DGGrid_RemoveCurrentRow.Enabled = True
            FrmMain.DG_Show.ReadOnly = False

            FrmMain.DG_Show.SelectionMode = DataGridViewSelectionMode.RowHeaderSelect
            FrmMain.gb_DetailWLed.Enabled = True

            FrmMain.DG_Devices.ReadOnly = False
            FrmMain.btnAddDevice.Enabled = True
            FrmMain.btnDeleteDevice.Enabled = True
        End If
        My.Settings.Save()
    End Sub



    Public Function TimeStringToMilliseconds(ByVal timeString As String) As Long
        ' Controleer of de string het verwachte formaat heeft (mm:ss)
        If timeString = "" Then
            Return 0
        End If

        If Not System.Text.RegularExpressions.Regex.IsMatch(timeString, "^\d{2}:\d{2}$") Then
            ' Gooi een exception of retourneer een foutwaarde als het formaat onjuist is
            ToonFlashBericht("De tijdstring moet het formaat mm:ss hebben.", 5, FlashSeverity.IsWarning)
            Return 0
        End If

        ' Splits de string op de dubbele punt
        Dim parts As String() = timeString.Split(":")

        ' Parse de minuten en seconden naar integers
        Dim minutes As Integer
        If Not Integer.TryParse(parts(0), minutes) Then
            Throw New FormatException("Ongeldige minutenwaarde.")
            ' Return -1
        End If

        Dim seconds As Integer
        If Not Integer.TryParse(parts(1), seconds) Then
            Throw New FormatException("Ongeldige secondenwaarde.")
            ' Return -1
        End If

        ' Controleer of de minuten en seconden binnen geldige bereiken liggen
        If minutes < 0 Or minutes > 59 Or seconds < 0 Or seconds > 59 Then
            Throw New ArgumentOutOfRangeException("De minuten en seconden moeten binnen het bereik 0-59 liggen.")
            ' Return -1
        End If

        ' Bereken het totale aantal milliseconden
        Dim totalMilliseconds As Long = (minutes * 60 + seconds) * 1000

        Return totalMilliseconds

    End Function



    Public Function RemoveSecondFromStringTime(ByVal timeString As String) As String
        If timeString = "00:00" Or timeString = "" Then
            Return "00:00"
        End If

        ' Controleer of de string het verwachte formaat heeft (mm:ss)
        If Not System.Text.RegularExpressions.Regex.IsMatch(timeString, "^\d{2}:\d{2}$") Then
            ToonFlashBericht("De tijdstring moet het formaat mm:ss hebben.", 2)
            Return "00:00"
        End If

        ' Splits de string op de dubbele punt
        Dim parts As String() = timeString.Split(":")

        ' Parse de minuten en seconden naar integers
        Dim minutes As Integer
        If Not Integer.TryParse(parts(0), minutes) Then
            Throw New FormatException("Ongeldige minutenwaarde.")
        End If

        Dim seconds As Integer
        If Not Integer.TryParse(parts(1), seconds) Then
            Throw New FormatException("Ongeldige secondenwaarde.")
        End If

        ' Controleer of de minuten en seconden binnen geldige bereiken liggen
        If minutes < 0 Or minutes > 59 Or seconds < 0 Or seconds > 59 Then
            Throw New ArgumentOutOfRangeException("De minuten en seconden moeten binnen het bereik 0-59 liggen.")
        End If

        ' Verminder de seconden met 1
        seconds -= 1

        ' Handel het overgaan van seconden naar minuten af
        If seconds < 0 Then
            seconds = 59
            minutes -= 1
            ' Als de minuten ook onder 0 komen, dan is het resultaat 00:00
            If minutes < 0 Then
                minutes = 0
            End If
        End If

        ' Formatteer de nieuwe minuten en seconden terug naar een string
        Dim newTimeString As String = minutes.ToString("D2") & ":" & seconds.ToString("D2")

        Return newTimeString

    End Function



End Module



Imports System.IO
Imports System.Runtime.InteropServices
Imports PdfiumViewer



Public Class FrmMain
    Public Const nextScene As Integer = 0
    Public Const nextEvent As Integer = 1
    Dim StartUpActive As Boolean = True

    'Private LedKleuren As New List(Of Color)
    Dim LastOfflineDevices As Integer = 0       'Nummer van offline apparaten
    Public CurrentGroupId As Integer = 0
    Public CurrentDeviceId As Integer = 0
    Private laatsteDDPHash As Integer = 0
    Public ZoomFactor As Integer = 60

    ' PDF state
    Friend pdfFilePath As String = ""
    Friend currentPage As Integer = 0
    Private pdfDoc As PdfDocument
    Private pdfScroll As VScrollBar ' dynamische scrollbar voor PDF
    Private updatingScroll As Boolean = False

    ' Optional timers you might use later
    Friend pdfPageUpdateTimer As Timer

    ' Importeer de functie voor het ophalen van Frame delays
    <DllImport("gdi32.dll", SetLastError:=True, ExactSpelling:=True)>
    Private Shared Function GetEnhMetaFilePixelFormat(ByVal hEmf As IntPtr) As UInteger
    End Function

    Private _hotkeys As HotkeyControl

    Private initialBlinkTimer As Timer
    Private initialBlinkState As Boolean = False
    Private startBtnDefaultBackColor As Color

    Private Sub FrmMain_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        _hotkeys = New HotkeyControl(Me, cbMonitorControl)
    End Sub

    Private Sub FrmMain_FormClosed(sender As Object, e As FormClosedEventArgs) Handles MyBase.FormClosed
        If _hotkeys IsNot Nothing Then
            _hotkeys.Dispose()
            _hotkeys = Nothing
        End If
    End Sub


    ' **************************************************************************************************************************
    ' MAIN FORM LOAD
    ' **************************************************************************************************************************
    Private Sub FrmMain_Load_1(sender As Object, e As EventArgs) Handles MyBase.Load
        Try
            Me.KeyPreview = True ' keyboard shortcuts for PDF auto scroll

            Dim c As Integer = 0
            ' Configureer de DataGridView voor de Devices tab
            DG_Devices.AutoGenerateColumns = False
            DG_Devices.AllowUserToAddRows = False
            DG_Devices.AllowUserToDeleteRows = False
            DG_Devices.ReadOnly = False

            ' Donkere stijl voor DG_Show: zwarte achtergrond, witte tekst
            If DG_Show IsNot Nothing Then
                With DG_Show
                    .EnableHeadersVisualStyles = False
                    .BackgroundColor = Color.Black
                    .GridColor = Color.FromArgb(60, 60, 60)

                    ' Headers
                    .ColumnHeadersDefaultCellStyle.BackColor = Color.Black
                    .ColumnHeadersDefaultCellStyle.ForeColor = Color.White
                    .RowHeadersDefaultCellStyle.BackColor = Color.Black
                    .RowHeadersDefaultCellStyle.ForeColor = Color.White

                    ' Rijen
                    .RowsDefaultCellStyle.BackColor = Color.Black
                    .RowsDefaultCellStyle.ForeColor = Color.White
                    .AlternatingRowsDefaultCellStyle.BackColor = Color.Black
                    .AlternatingRowsDefaultCellStyle.ForeColor = Color.White

                    ' Selectie
                    .DefaultCellStyle.BackColor = Color.Black
                    .DefaultCellStyle.ForeColor = Color.White
                    .DefaultCellStyle.SelectionBackColor = Color.FromArgb(64, 64, 64)
                    .DefaultCellStyle.SelectionForeColor = Color.White
                End With

                ' Forceer ook zwarte stijl op alle combobox-kolommen (pulldowns)
                For Each col As DataGridViewColumn In DG_Show.Columns
                    If TypeOf col Is DataGridViewComboBoxColumn Then
                        Dim ccol = DirectCast(col, DataGridViewComboBoxColumn)
                        ccol.FlatStyle = FlatStyle.Flat
                        ccol.DisplayStyle = DataGridViewComboBoxDisplayStyle.DropDownButton
                        ccol.DefaultCellStyle.BackColor = Color.Black
                        ccol.DefaultCellStyle.ForeColor = Color.White
                        ccol.DefaultCellStyle.SelectionBackColor = Color.FromArgb(64, 64, 64)
                        ccol.DefaultCellStyle.SelectionForeColor = Color.White
                    End If
                Next
            End If

            ' PDF viewer achtergrond donker zetten
            If pbPDFViewer IsNot Nothing Then
                pbPDFViewer.BackColor = Color.Black
            End If
            If SplitContainer2 IsNot Nothing AndAlso SplitContainer2.Panel2 IsNot Nothing Then
                SplitContainer2.Panel2.BackColor = Color.Black
            End If


            ' Configureer de DataGridView voor de Effecten tab
            DG_Effecten.AllowUserToAddRows = False
            DG_Effecten.AllowUserToDeleteRows = False
            DG_Effecten.ReadOnly = True

            ' Configureer de DataGridView voor de Paletten tab
            DG_Paletten.AllowUserToAddRows = False
            DG_Paletten.AllowUserToDeleteRows = False
            DG_Paletten.ReadOnly = True

            'ShowHandler.ConfigureDG_Show(Me.DG_Show)
            txtIPRange.Text = My.Settings.IPRange
            settings_ProjectFolder.Text = My.Settings.DatabaseFolder
            settings_ProjectName.Text = My.Settings.ProjectName
            lblTitleProject.Text = My.Settings.ProjectName
            settings_PalettesPath.Text = My.Settings.PaletteImagesPath
            settings_EffectsPath.Text = My.Settings.EffectsImagePath
            cbMonitorControl.Text = My.Settings.MonitorControl
            cbMonitorPrime.Text = My.Settings.MonitorPrimary
            cbMonitorSecond.Text = My.Settings.MonitorSecond
            settings_DDPPort.Text = My.Settings.DDPPort
            settings_ScriptPDF.Text = My.Settings.ScriptPDF


            Dim tip As New ToolTip()

            If My.Settings.Locked Then
                Update_LockUnlocked("Locked")
                LoadAll()
            Else
                Update_LockUnlocked("Unlocked")
            End If


            c = CheckWLEDOnlineStatus(DG_Devices)
            If (c > 0) Then
                Select Case c
                    Case 0
                        ToonFlashBericht("Alle WLED-apparaten online.", 1, FlashSeverity.IsInfo)
                    Case 1
                        ToonFlashBericht("Er is 1 WLED-apparaat offline op het netwerk.", 5, FlashSeverity.IsWarning)
                    Case Else
                        ToonFlashBericht("Er zijn " + c.ToString + " WLED-apparaten offline op het netwerk.", 5, FlashSeverity.IsWarning)
                End Select
            End If

            CurrentGroupId = -1
            CurrentDeviceId = -1


            ' Zorg dat kolom ScriptPg bestaat in DG_Show
            If DG_Show IsNot Nothing AndAlso Not DG_Show.Columns.Contains("ScriptPg") Then
                Dim col As New DataGridViewTextBoxColumn()
                col.Name = "ScriptPg"
                col.HeaderText = "ScriptPg"
                col.Width = 60
                DG_Show.Columns.Add(col)
            End If

            ' Herstel splitterpositie indien opgeslagen (>0)
            Try
                Dim saved = My.Settings.SplitPosition
                If saved > 0 Then
                    ' Clamp binnen grenzen (laat minimaal 50px per paneel over)
                    Dim minDist = 50
                    Dim maxDist = Math.Max(minDist, SplitContainer2.Width - 50)
                    SplitContainer2.SplitterDistance = Math.Max(minDist, Math.Min(saved, maxDist))
                End If
            Catch
            End Try

            ' PDF laden
            LoadPdfFromSettings()
            If pbPDFViewer IsNot Nothing Then
                AddHandler pbPDFViewer.Resize, Sub() RenderCurrentPdfPage()
                AddHandler pbPDFViewer.MouseWheel, AddressOf pbPDFViewer_MouseWheel
                AddHandler pbPDFViewer.MouseEnter, Sub() pbPDFViewer.Focus()
            End If

            ' Enable PDF annotations
            ScriptEditor.Initialize()

            UpdateMonitorStatusIndicators(cbMonitorControl, cbMonitorPrime, cbMonitorSecond)

            If (ImagesAreEqual(pbPrimaryStatus.Image, My.Resources.iconGreenBullet1)) Then
                If Not String.Equals(My.Settings.MonitorPrimary, "Disabled", StringComparison.OrdinalIgnoreCase) Then
                    SetPrimaryBeamerToCorrectOutput()
                    Beamer_Primary.Show()
                    Beamer_Primary.FormBorderStyle = FormBorderStyle.None
                    Beamer_Primary.BringToFront()
                Else
                    Beamer_Primary.Hide()
                End If
            Else
                If Not String.Equals(My.Settings.MonitorPrimary, "Disabled", StringComparison.OrdinalIgnoreCase) Then
                    ToonFlashBericht("Primary beamer is niet verbonden of ingesteld.", 5, FlashSeverity.IsWarning)
                End If
            End If

            If (ImagesAreEqual(pbSecondaryStatus.Image, My.Resources.iconGreenBullet1)) Then
                If Not String.Equals(My.Settings.MonitorSecond, "Disabled", StringComparison.OrdinalIgnoreCase) Then
                    SetSecondairyBeamerToCorrectOutput()
                    Beamer_Secondairy.Show()
                    Beamer_Secondairy.FormBorderStyle = FormBorderStyle.None
                    Beamer_Secondairy.BringToFront()
                Else
                    Beamer_Secondairy.Hide()
                End If
            Else
                If Not String.Equals(My.Settings.MonitorSecond, "Disabled", StringComparison.OrdinalIgnoreCase) Then
                    ToonFlashBericht("Secondary beamer is niet verbonden of ingesteld.", 5, FlashSeverity.IsWarning)
                End If
            End If

            StartUpActive = False

        Catch ex As Exception
            MessageBox.Show($"Fout tijdens laden van form: {ex.Message}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End Try
    End Sub

    ' Zorg dat combobox editing control ook donker is met witte tekst
    Private Sub DG_Show_EditingControlShowing(sender As Object, e As DataGridViewEditingControlShowingEventArgs) Handles DG_Show.EditingControlShowing
        Dim cmb = TryCast(e.Control, ComboBox)
        If cmb IsNot Nothing Then
            cmb.FlatStyle = FlatStyle.Flat
            cmb.BackColor = Color.Black
            cmb.ForeColor = Color.White
            cmb.DrawMode = DrawMode.OwnerDrawFixed
            RemoveHandler cmb.DrawItem, AddressOf ComboBox_DrawItem_Dark
            AddHandler cmb.DrawItem, AddressOf ComboBox_DrawItem_Dark
        End If
    End Sub

    Private Sub ComboBox_DrawItem_Dark(sender As Object, e As DrawItemEventArgs)
        Try
            e.DrawBackground()
            Dim back As Color = Color.Black
            If (e.State And DrawItemState.Selected) = DrawItemState.Selected Then
                back = Color.FromArgb(64, 64, 64)
            End If
            Using bg As New SolidBrush(back)
                e.Graphics.FillRectangle(bg, e.Bounds)
            End Using
            If e.Index >= 0 Then
                Dim cmb = DirectCast(sender, ComboBox)
                Dim text = cmb.GetItemText(cmb.Items(e.Index))
                TextRenderer.DrawText(e.Graphics, text, cmb.Font, e.Bounds, Color.White, TextFormatFlags.Left)
            End If
            e.DrawFocusRectangle()
        Catch
            ' ignore draw issues
        End Try
    End Sub


    ' **************************************************************************************************************************
    ' EVENT HANDLERS - Klik op DG Devices en open de bijbehorende webste
    ' **************************************************************************************************************************
    Private Sub DG_Devices_CellContentClick(sender As Object, e As DataGridViewCellEventArgs)
        If e.ColumnIndex < 2 Then
            OpenWebsiteOfWLED(DG_Devices, txt_APIResult, e)
        End If
    End Sub


    ' **************************************************************************************************************************
    ' EVENT HANDLERS - Klikken in de effecten tabel
    ' **************************************************************************************************************************
    Private Sub DG_Effecten_CellContentClick(sender As Object, e As DataGridViewCellEventArgs) Handles DG_Effecten.CellContentClick
        Handle_DGEffecten_CellContentClick(sender, e, Me.DG_Effecten, Me.DG_Devices)

    End Sub

    ' **************************************************************************************************************************
    ' EVENT HANDLERS - Opslaan
    ' **************************************************************************************************************************
    Private Sub btnSaveShow_Click(sender As Object, e As EventArgs) Handles btnSaveShow.Click
        SaveAll()
    End Sub

    ' **************************************************************************************************************************
    ' EVENT HANDLERS - Klikken in pallet tabel
    ' **************************************************************************************************************************
    Private Sub DG_Paletten_CellContentClick(sender As Object, e As DataGridViewCellEventArgs) Handles DG_Paletten.CellContentClick
        KLT_LedShow.DG_Paletten_CellContentClick(sender, e, DG_Paletten, DG_Devices)
    End Sub


    Private Sub DG_Show_AfterUpdateCellValue(sender As Object, e As DataGridViewCellEventArgs) Handles DG_Show.CellValueChanged
        KLT_LedShow.DG_Show_AfterUpdateCellValue(sender, e, DG_Show, DG_Effecten, DG_Paletten)
    End Sub

    Private Sub ToolStripComboBox1_Click(sender As Object, e As EventArgs) Handles filterAct.Click
        FilterDG_Show(DG_Show, filterAct)
    End Sub

    Private Sub btn_DG_Show_AddNewRowBefore_Click(sender As Object, e As EventArgs) Handles btn_DGGrid_AddNewRowBefore.Click
        DG_Show_AddNewRowBefore_Click(DG_Show)
    End Sub

    Private Sub btn_DG_Show_AddNewRowAfter_Click(sender As Object, e As EventArgs) Handles btn_DGGrid_AddNewRowAfter.Click
        DG_Show_AddNewRowAfter_Click(DG_Show)
    End Sub

    Private Sub btn_DG_Show_RemoveCurrentRow_Click(sender As Object, e As EventArgs) Handles btn_DGGrid_RemoveCurrentRow.Click
        DG_Show_RemoveCurrentRow_Click(DG_Show)
    End Sub

    Private Sub DG_Show_DataError(sender As Object, e As DataGridViewDataErrorEventArgs) Handles DG_Show.DataError
        On Error Resume Next
        'ToonFlashBericht("DG_Show_DataError: " & e.Exception.Message, 10, FlashSeverity.IsError)
    End Sub

    Private Sub cbMonitorControl_SelectedIndexChanged(sender As Object, e As EventArgs) Handles cbMonitorControl.SelectedIndexChanged
        My.Settings.MonitorControl = cbMonitorControl.Text
        My.Settings.Save()
        MoveAndMaximizeForm(cbMonitorControl.Text)
    End Sub


    Private Sub Timer1_Tick(sender As Object, e As EventArgs) Handles TimerEverySecond.Tick
        UpdateMonitorStatusIndicators(cbMonitorControl, cbMonitorPrime, cbMonitorSecond)
        UpdateCurrentTime()
        UpdateBlinkingButton()

        lblControl_TimeLeft.Text = RemoveSecondFromStringTime(lblControl_TimeLeft.Text)
    End Sub




    Private Async Sub btnScanNetworkForWLed_Click(sender As Object, e As EventArgs)
        Await ScanNetworkForWLEDDevices(DG_Devices)

        ' Call your post-scan functions in order
        SplitIntoGroups(DG_Devices, DG_Groups)
        'PopulateTreeView(DG_Groups, tvGroupsSelected)
        Update_DGEffecten_BasedOnDevices()
        Update_DGPalettes_BasedOnDevices()
        ToonFlashBericht("Scan complete.", 3)

    End Sub



    Private Sub btnProjectFolder_Click(sender As Object, e As EventArgs) Handles btnProjectFolder.Click
        If OpenFileDialog1.ShowDialog() = DialogResult.OK Then
            Try
                Dim fileName As String = OpenFileDialog1.FileName
                Dim filePath As String = Path.GetDirectoryName(fileName)
                Me.settings_ProjectFolder.Text = filePath
                My.Settings.DatabaseFolder = filePath
            Catch ex As Exception
                ToonFlashBericht("Fout bij het openen van het bestand: " & ex.Message, 10, FlashSeverity.IsError)
            End Try
        End If
        My.Settings.Save()
    End Sub

    Private Sub settings_ProjectName_TextChanged(sender As Object, e As EventArgs) Handles settings_ProjectName.TextChanged
        My.Settings.ProjectName = settings_ProjectName.Text
        lblTitleProject.Text = settings_ProjectName.Text

        My.Settings.Save()
    End Sub

    Private Sub btnLockUnlocked_Click(sender As Object, e As EventArgs) Handles btnLockUnlocked.Click
        If btnLockUnlocked.Text = "Locked" Then
            Update_LockUnlocked("Unlocked")
            ToonFlashBericht("Project " & lblTitleProject.Text & " is nu unlocked.", 5)
        Else
            Update_LockUnlocked("Locked")
            ToonFlashBericht("Project " & lblTitleProject.Text & " is locked.", 5)
        End If

    End Sub

    Private Sub ToolStripButton1_Click(sender As Object, e As EventArgs) Handles ToolStripButton1.Click
        DG_Palette_LoadImages(DG_Paletten)

    End Sub

    Private Sub DG_Show_CellClick(sender As Object, e As DataGridViewCellEventArgs) Handles DG_Show.CellClick
        ' Controleer of de klik op een knopcel in de gewenste kolom was
        Dim RowId = e.RowIndex
        Dim FixtureValue As String = ""
        If e.ColumnIndex = DG_Show.Columns("btnApply").Index AndAlso e.RowIndex >= 0 Then
            If DG_Show.CurrentRow.Cells("colFixture").Value IsNot Nothing Then
                FixtureValue = DG_Show.CurrentRow.Cells("colFixture").Value.ToString()
            End If

            If (FixtureValue = "") Then Exit Sub

            If (FixtureValue.Substring(0, 2) = "**") Then
                ' VIDEO
                ApplyRowToBeamer(DG_Show.CurrentRow)
            Else
                ' WLED
                KLT_LedShow.Apply_DGShowRow_ToWLED(sender, DG_Devices, DG_Effecten, DG_Paletten, True)
            End If


        End If
    End Sub

    Private Sub DG_Show_RowEnter(sender As Object, e As DataGridViewCellEventArgs) Handles DG_Show.RowEnter

        ' New: when locked, selecting a row should update which Next button blinks
        Try
            If e.RowIndex >= 0 AndAlso My.Settings.Locked Then
                Dim r = DG_Show.Rows(e.RowIndex)

                If Not (StartUpActive) Then
                    KLT_LedShow.RefreshBlinkForSelection(DG_Show, r)
                End If
            End If
        Catch
        End Try

    End Sub


    Private Sub btnControl_Start_Click(sender As Object, e As EventArgs) Handles btnControl_Start.Click
        Start_Show(DG_Show)
    End Sub

    Private Sub TimerNextEvent_Tick(sender As Object, e As EventArgs) Handles TimerNextEvent.Tick
        EndEventTimer()
    End Sub

    Private Sub TimerPingDevices_Tick(sender As Object, e As EventArgs) Handles TimerPingDevices.Tick
        If btnAutoPing.Checked = False Then
            Return
        End If

        Dim C As Integer
        C = CheckWLEDOnlineStatus(DG_Devices)

        If (C <> LastOfflineDevices) Then
            LastOfflineDevices = C

            Select Case C
                Case 0
                    ToonFlashBericht("Er zijn geen WLED-apparaten offline.", 5, FlashSeverity.IsInfo)
                Case 1
                    ToonFlashBericht("Er is 1 WLED-apparaat offline op het netwerk.", 5, FlashSeverity.IsWarning)
                Case Else
                    ToonFlashBericht("Er zijn " + C.ToString + " WLED-apparaten offline op het netwerk.", 10, FlashSeverity.IsWarning)
            End Select
        End If
    End Sub


    Private Sub btnAddDevice_Click(sender As Object, e As EventArgs)
        DG_Devices_AddNewRowAfter_Click(DG_Devices, DG_Show, DG_Groups)
    End Sub

    Private Sub btnDeleteDevice_Click(sender As Object, e As EventArgs)
        DG_Devices_RemoveCurrentRow_Click(DG_Devices)
    End Sub

    Private Sub btnLoadAll_Click(sender As Object, e As EventArgs) Handles btnLoadAll.Click
        LoadAll()
    End Sub

    'Private Sub btnLoadEffectPalettes_Click(sender As Object, e As EventArgs)
    '    LoadEffectPalettes()
    'End Sub


    Private Sub btnTestExistanceEffects_Click(sender As Object, e As EventArgs) Handles btnTestExistanceEffects.Click
        TextExistanceEffects(DG_Effecten, My.Settings.EffectsImagePath)
    End Sub



    Private Sub btnUpdateStage_Click(sender As Object, e As EventArgs)

    End Sub

    Private Sub DG_Devices_CellValidated(sender As Object, e As DataGridViewCellEventArgs)
        On Error Resume Next

        If e.ColumnIndex = DG_Devices.Columns("colLayout").Index Then

            Dim oldValue = DG_Devices.Rows(e.RowIndex).Cells(e.ColumnIndex).Value
            Dim newValue = ValidateLayoutString(oldValue)
            DG_Devices.Rows(e.RowIndex).Cells(e.ColumnIndex).Value = newValue
        End If
    End Sub

    Private Sub btnGroupAddRowAfter_Click(sender As Object, e As EventArgs)
        GroupAddRowAfter(DG_Groups)
    End Sub

    Private Sub btnGroupAddRowBefore_Click(sender As Object, e As EventArgs)
        GroupAddRowBefore(DG_Groups)
    End Sub

    Private Sub btnGroupDeleteRow_Click(sender As Object, e As EventArgs)
        GroupDeleteRow(DG_Groups)
    End Sub





    Private Sub settings_EffectsPath_TextChanged(sender As Object, e As EventArgs) Handles settings_EffectsPath.TextChanged
        My.Settings.EffectsImagePath = settings_EffectsPath.Text
        My.Settings.Save()
    End Sub

    Private Sub settings_PalettesPath_TextChanged(sender As Object, e As EventArgs) Handles settings_PalettesPath.TextChanged
        My.Settings.PaletteImagesPath = settings_PalettesPath.Text
        My.Settings.Save()
    End Sub

    Private Sub settings_DDPPort_TextChanged(sender As Object, e As EventArgs) Handles settings_DDPPort.TextChanged
        My.Settings.DDPPort = CInt(settings_DDPPort.Text)
        My.Settings.Save()
    End Sub


    Private Sub btnDevicesRefreshIPs_Click(sender As Object, e As EventArgs)
        RefreshIPAddresses(DG_Devices)
    End Sub

    Private Sub btnGroupsAutoSplit_Click(sender As Object, e As EventArgs)
        SplitIntoGroups(DG_Devices, DG_Groups)
    End Sub













    Private Sub btnLoadAll_Click_1(sender As Object, e As EventArgs) Handles btnLoadAll.Click
        LoadAll()
    End Sub



    Private Sub btnRebuildDGEffects_Click(sender As Object, e As EventArgs) Handles btnRebuildDGEffects.Click
        Update_DGEffecten_BasedOnDevices()
    End Sub

    Private Sub btnRebuildDGPalettes_Click(sender As Object, e As EventArgs) Handles btnRebuildDGPalettes.Click
        Update_DGPalettes_BasedOnDevices()
    End Sub

    Private Sub btnSendUpdatedSegmentsToWLED_Click(sender As Object, e As EventArgs)
        SetSegmentsFromGrid(DG_Devices)
    End Sub

    Private Sub DG_Show_RowHeaderMouseDoubleClick(sender As Object, e As DataGridViewCellMouseEventArgs) Handles DG_Show.RowHeaderMouseDoubleClick

        If e.RowIndex < 0 Then Exit Sub


        Dim row = DG_Show.Rows(e.RowIndex)
        Dim rowData As New Dictionary(Of String, Object)

        ' Collect all column values, including hidden ones
        For Each col As DataGridViewColumn In DG_Show.Columns
            rowData(col.Name) = row.Cells(col.Index).Value
        Next

        Dim FixtureString As String = rowData("colFixture").ToString
        If (FixtureString <> "") Then
            FixtureString = rowData("colFixture").ToString().Substring(0, 2)
        End If

        If (FixtureString = "**") Then
            ' Show the details form FOR VIDEO
            Using detailsForm As New PopUp_DetailShowVideo(rowData)
                If detailsForm.ShowDialog() = DialogResult.OK Then
                    ' Update the row with any changes
                    For Each col As DataGridViewColumn In DG_Show.Columns
                        row.Cells(col.Index).Value = rowData(col.Name)
                    Next
                End If
            End Using

        Else
            ' Show the details form FOR WLED
            Using detailsForm As New PopUp_DetailShowWLED(rowData)
                If detailsForm.ShowDialog() = DialogResult.OK Then
                    ' Update the row with any changes
                    For Each col As DataGridViewColumn In DG_Show.Columns
                        row.Cells(col.Index).Value = rowData(col.Name)
                    Next
                End If
            End Using
        End If
    End Sub

    Private Sub btnControl_NextEvent_Click(sender As Object, e As EventArgs) Handles btnControl_NextEvent.Click
        HandleNextEventClick(Me.DG_Show)
    End Sub

    Private Sub btnControl_NextScene_Click(sender As Object, e As EventArgs) Handles btnControl_NextScene.Click
        HandleNextSceneClick(Me.DG_Show)
    End Sub

    ' Optional
    Private Sub btnControl_NextAct_Click(sender As Object, e As EventArgs) Handles btnControl_NextAct.Click
        HandleNextActClick(Me.DG_Show)
    End Sub

    Private Sub WMP_PrimaryPlayer_Preview_PositionChange(sender As Object, e As AxWMPLib._WMPOCXEvents_PositionChangeEvent) Handles WMP_PrimaryPlayer_Preview.PositionChange
        ' Synchronize the live player position with the preview player
        Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.currentPosition = WMP_PrimaryPlayer_Preview.Ctlcontrols.currentPosition
    End Sub

    Private Sub WMP_PrimaryPlayer_Preview_ClickEvent(sender As Object, e As AxWMPLib._WMPOCXEvents_ClickEvent) Handles WMP_PrimaryPlayer_Preview.ClickEvent
        ' Synchronize play, pause, and stop states to the live player
        Dim previewState As Integer = WMP_PrimaryPlayer_Preview.playState

        Select Case previewState
            Case WMPLib.WMPPlayState.wmppsPlaying
                Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.play()
            Case WMPLib.WMPPlayState.wmppsPaused
                Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.pause()
            Case WMPLib.WMPPlayState.wmppsStopped
                Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.stop()
                btnStopLoopingAtEndOfVideo.Visible = False
        End Select

        ' Synchronize volume to the live player
        Beamer_Primary.WMP_PrimaryPlayer_Live.settings.volume = WMP_PrimaryPlayer_Preview.settings.volume
    End Sub

    Private Sub WMP_PrimaryPlayer_Preview_PlayStateChange(sender As Object, e As AxWMPLib._WMPOCXEvents_PlayStateChangeEvent) Handles WMP_PrimaryPlayer_Preview.PlayStateChange
        ' Synchronize play, pause, and stop states to the live player
        Select Case WMP_PrimaryPlayer_Preview.playState
            Case WMPLib.WMPPlayState.wmppsPlaying
                Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.play()
            Case WMPLib.WMPPlayState.wmppsPaused
                Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.pause()
            Case WMPLib.WMPPlayState.wmppsStopped
                Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.stop()
                btnStopLoopingAtEndOfVideo.Visible = False
        End Select
    End Sub

    Private Sub WMP_SecondairyPlayer_Preview_PositionChange(sender As Object, e As AxWMPLib._WMPOCXEvents_PositionChangeEvent) Handles WMP_SecondairyPlayer_Preview.PositionChange
        ' Synchronize the live player position with the preview player
        Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.currentPosition = WMP_SecondairyPlayer_Preview.Ctlcontrols.currentPosition
    End Sub

    Private Sub WMP_SecondairyPlayer_Preview_ClickEvent(sender As Object, e As AxWMPLib._WMPOCXEvents_ClickEvent) Handles WMP_SecondairyPlayer_Preview.ClickEvent
        ' Synchronize play, pause, and stop states to the live player
        Dim previewState As Integer = WMP_SecondairyPlayer_Preview.playState

        Select Case previewState
            Case WMPLib.WMPPlayState.wmppsPlaying
                Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.play()
            Case WMPLib.WMPPlayState.wmppsPaused
                Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.pause()
            Case WMPLib.WMPPlayState.wmppsStopped
                Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.stop()
        End Select

        ' Synchronize volume to the live player
        Beamer_Secondairy.WMP_SecondairyPlayer_Live.settings.volume = WMP_SecondairyPlayer_Preview.settings.volume
    End Sub

    Private Sub WMP_SecondairyPlayer_Preview_PlayStateChange(sender As Object, e As AxWMPLib._WMPOCXEvents_PlayStateChangeEvent) Handles WMP_SecondairyPlayer_Preview.PlayStateChange
        ' Synchronize play, pause, and stop states to the live player
        Select Case WMP_SecondairyPlayer_Preview.playState
            Case WMPLib.WMPPlayState.wmppsPlaying
                Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.play()
            Case WMPLib.WMPPlayState.wmppsPaused
                Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.pause()
            Case WMPLib.WMPPlayState.wmppsStopped
                Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.stop()
        End Select
    End Sub

    Private Sub btnControl_StopAll_Click(sender As Object, e As EventArgs) Handles btnControl_StopAll.Click
        StopAll()

    End Sub

    Private Sub btnStopLoopingAtEndOfVideo_Click(sender As Object, e As EventArgs)
        Beamer_Primary.WMP_PrimaryPlayer_Live.settings.setMode("loop", False)
        Beamer_Secondairy.WMP_SecondairyPlayer_Live.settings.setMode("loop", False)
        WMP_PrimaryPlayer_Preview.settings.setMode("loop", False)
        WMP_SecondairyPlayer_Preview.settings.setMode("loop", False)

        ToonFlashBericht("Video stopt na deze cyclus.", 5)
        TurnOnBlinkOfStopLooping()
    End Sub




    Private Sub EnsurePdfScrollBar()
        If pdfScroll Is Nothing Then
            pdfScroll = New VScrollBar() With {
            .Name = "vScrollPDF",
            .Dock = DockStyle.Right,
            .SmallChange = 1,
            .LargeChange = 1
        }
            AddHandler pdfScroll.Scroll, AddressOf pdfScroll_Scroll
            ' Vind panel2 van SplitContainer2 (bevat pbPDFViewer)
            Try
                If SplitContainer2 IsNot Nothing AndAlso SplitContainer2.Panel2 IsNot Nothing Then
                    SplitContainer2.Panel2.Controls.Add(pdfScroll)
                    pdfScroll.BringToFront()
                End If
            Catch
            End Try
        End If
        If pdfDoc Is Nothing Then
            pdfScroll.Enabled = False
        Else
            updatingScroll = True
            pdfScroll.Enabled = True
            pdfScroll.Minimum = 1
            pdfScroll.Maximum = pdfDoc.PageCount
            pdfScroll.Value = Math.Max(1, Math.Min(currentPage, pdfScroll.Maximum))
            updatingScroll = False
        End If
    End Sub

    Private Sub pdfScroll_Scroll(sender As Object, e As ScrollEventArgs)
        If updatingScroll Then Return
        If pdfDoc Is Nothing Then Return
        If pdfScroll Is Nothing Then Return
        If pdfScroll.Value <> currentPage Then
            SetPdfPage(pdfScroll.Value)
        End If
    End Sub

    Private Sub SyncScrollBar()
        If pdfScroll Is Nothing OrElse pdfDoc Is Nothing Then Return
        updatingScroll = True
        Dim target = Math.Max(pdfScroll.Minimum, Math.Min(pdfScroll.Maximum, currentPage))
        If pdfScroll.Value <> target Then
            pdfScroll.Value = target
        End If
        updatingScroll = False
    End Sub

    Private Sub LoadPdfFromSettings()
        Try
            Dim configuredPath As String = My.Settings.ScriptPDF
            If String.IsNullOrWhiteSpace(configuredPath) OrElse Not File.Exists(configuredPath) Then
                lblPDFPage.Text = "Pg -"
                If pbPDFViewer IsNot Nothing Then pbPDFViewer.Image = Nothing
                If pdfScroll IsNot Nothing Then pdfScroll.Enabled = False
                Return
            End If
            If pdfDoc IsNot Nothing Then
                pdfDoc.Dispose()
                pdfDoc = Nothing
            End If
            pdfFilePath = configuredPath
            pdfDoc = PdfDocument.Load(pdfFilePath)
            currentPage = 1 ' start op pagina 1
            EnsurePdfScrollBar()
            RenderCurrentPdfPage()
            UpdatePdfPageLabel()
            SyncScrollBar()
        Catch ex As Exception
            lblPDFPage.Text = "Pg -"
            If pbPDFViewer IsNot Nothing Then pbPDFViewer.Image = Nothing
            If pdfScroll IsNot Nothing Then pdfScroll.Enabled = False
            ToonFlashBericht("Kon PDF niet laden: " & ex.Message, 8, FlashSeverity.IsError)
        End Try
    End Sub

    Private Sub SetPdfPage(newPage As Integer)
        If pdfDoc Is Nothing Then Return
        currentPage = Math.Max(1, Math.Min(newPage, pdfDoc.PageCount))
        RenderCurrentPdfPage()
        SyncScrollBar()
    End Sub

    Private Sub pbPDFViewer_MouseWheel(sender As Object, e As MouseEventArgs)
        If pdfDoc Is Nothing Then Return
        If e.Delta > 0 Then
            SetPdfPage(currentPage - 1)
        ElseIf e.Delta < 0 Then
            SetPdfPage(currentPage + 1)
        End If
    End Sub

    Private Sub RenderCurrentPdfPage()
        If pdfDoc Is Nothing OrElse pbPDFViewer Is Nothing Then Return
        If currentPage < 1 OrElse currentPage > pdfDoc.PageCount Then Return
        Try
            Using img = pdfDoc.Render(currentPage - 1, pbPDFViewer.Width, pbPDFViewer.Height, 150, 150, True)
                Dim old = pbPDFViewer.Image
                pbPDFViewer.Image = CType(img.Clone(), Image)
                If old IsNot Nothing Then old.Dispose()
            End Using
        Catch
        End Try
        UpdatePdfPageLabel()
    End Sub

    Private Sub UpdatePdfPageLabel()
        If lblPDFPage Is Nothing Then Return
        If pdfDoc Is Nothing Then
            lblPDFPage.Text = "-"
        Else
            lblPDFPage.Text = currentPage & "/" & pdfDoc.PageCount
        End If
    End Sub

    ' ================== KEYBOARD SHORTCUTS VOOR PDF & SCRIPT ==================
    Private Sub FrmMain_KeyDown(sender As Object, e As KeyEventArgs) Handles MyBase.KeyDown
        If pdfDoc Is Nothing Then Return

        ' Navigatie toetsen
        Select Case e.KeyCode
            Case Keys.PageUp
                SetPdfPage(currentPage - 1)
                e.Handled = True
            Case Keys.PageDown
                SetPdfPage(currentPage + 1)
                e.Handled = True
            Case Keys.Home
                SetPdfPage(1)
                e.Handled = True
            Case Keys.End
                SetPdfPage(pdfDoc.PageCount)
                e.Handled = True
        End Select

        ' Ctrl+L: koppel huidige PDF pagina aan actieve DG_Show regel (ScriptPg)
        If e.Control AndAlso e.KeyCode = Keys.L Then
            Try
                If DG_Show IsNot Nothing AndAlso DG_Show.CurrentRow IsNot Nothing AndAlso Not DG_Show.CurrentRow.IsNewRow Then
                    If Not DG_Show.Columns.Contains("ScriptPg") Then
                        Dim col As New DataGridViewTextBoxColumn With {.Name = "ScriptPg", .HeaderText = "ScriptPg", .Width = 60}
                        DG_Show.Columns.Add(col)
                    End If
                    DG_Show.CurrentRow.Cells("ScriptPg").Value = currentPage
                    ToonFlashBericht($"Pagina {currentPage} gekoppeld aan regel.", 3, FlashSeverity.IsInfo)
                End If
            Catch ex As Exception
                ToonFlashBericht("Kon pagina niet koppelen: " & ex.Message, 5, FlashSeverity.IsError)
            End Try
            e.Handled = True
        End If

        ' Ctrl+G: ga naar pagina uit ScriptPg van huidige DG_Show regel
        If e.Control AndAlso e.KeyCode = Keys.G Then
            Try
                If DG_Show IsNot Nothing AndAlso DG_Show.CurrentRow IsNot Nothing Then
                    Dim cellVal = DG_Show.CurrentRow.Cells("ScriptPg").Value
                    Dim target As Integer
                    If cellVal IsNot Nothing AndAlso Integer.TryParse(cellVal.ToString(), target) Then
                        If target >= 1 AndAlso target <= pdfDoc.PageCount Then
                            SetPdfPage(target)
                            ToonFlashBericht($"Gesprongen naar pagina {target}.", 3, FlashSeverity.IsInfo)
                        Else
                            ToonFlashBericht("Opgeslagen pagina is ongeldig.", 4, FlashSeverity.IsWarning)
                        End If
                    Else
                        ToonFlashBericht("Geen pagina opgeslagen voor deze regel.", 3, FlashSeverity.IsWarning)
                    End If
                End If
            Catch ex As Exception
                ToonFlashBericht("Kon niet naar pagina springen: " & ex.Message, 5, FlashSeverity.IsError)
            End Try
            e.Handled = True
        End If
    End Sub

    Private Sub btnAutoGotoPDFPage_Click(sender As Object, e As EventArgs) Handles btnAutoGotoPDFPage.Click
        If (btnAutoGotoPDFPage.Text = "on") Then
            btnAutoGotoPDFPage.Text = "off"
            btnAutoGotoPDFPage.Checked = False
            btnAutoGotoPDFPage.Image = My.Resources.icon_toggle_off
        Else
            btnAutoGotoPDFPage.Text = "on"
            btnAutoGotoPDFPage.Checked = True
            btnAutoGotoPDFPage.Image = My.Resources.icon_toggle_on

        End If
    End Sub

    ' Externe toegang om naar een PDF-pagina te navigeren
    Public Sub NavigatePdfToPage(targetPage As Integer)
        Try
            If pdfDoc Is Nothing Then Return
            SetPdfPage(targetPage)
        Catch
            ' negeren bij ongeldige waarden
        End Try
    End Sub

    Private Sub btnAutoPing_Click(sender As Object, e As EventArgs)
        If btnAutoPing.Text = "on" Then
            btnAutoPing.Text = "off"
            btnAutoPing.Checked = False
            btnAutoPing.Image = My.Resources.icon_toggle_off
        Else
            btnAutoPing.Text = "on"
            btnAutoPing.Checked = True
            btnAutoPing.Image = My.Resources.icon_toggle_on

        End If

    End Sub


    Private Sub cbMonitorPrime_SelectedIndexChanged(sender As Object, e As EventArgs) Handles cbMonitorPrime.SelectedIndexChanged
        My.Settings.MonitorPrimary = cbMonitorPrime.Text
        My.Settings.Save()

        If String.Equals(cbMonitorPrime.Text, "Disabled", StringComparison.OrdinalIgnoreCase) Then
            Try
                Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.stop()
            Catch
            End Try
            Beamer_Primary.Hide()
        Else
            SetPrimaryBeamerToCorrectOutput()
            Beamer_Primary.FormBorderStyle = FormBorderStyle.None
            Beamer_Primary.Show()
            Beamer_Primary.BringToFront()
        End If
    End Sub

    Private Sub cbMonitorSecond_SelectedIndexChanged(sender As Object, e As EventArgs) Handles cbMonitorSecond.SelectedIndexChanged
        My.Settings.MonitorSecond = cbMonitorSecond.Text
        My.Settings.Save()

        If String.Equals(cbMonitorSecond.Text, "Disabled", StringComparison.OrdinalIgnoreCase) Then
            Try
                Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.stop()
            Catch
            End Try
            Beamer_Secondairy.Hide()
        Else
            SetSecondairyBeamerToCorrectOutput()
            Beamer_Secondairy.FormBorderStyle = FormBorderStyle.None
            Beamer_Secondairy.Show()
            Beamer_Secondairy.BringToFront()
        End If
    End Sub

    Private Sub btn_ScriptPDF_Click(sender As Object, e As EventArgs) Handles btn_ScriptPDF.Click
        Try
            Using dlg As New OpenFileDialog()
                dlg.Title = "Select script PDF"
                dlg.Filter = "PDF Files (*.pdf)|*.pdf|All Files (*.*)|*.*"
                dlg.CheckFileExists = True
                dlg.Multiselect = False

                If dlg.ShowDialog() = DialogResult.OK Then
                    Dim selectedPath As String = dlg.FileName
                    ' Update UI and settings
                    settings_ScriptPDF.Text = selectedPath
                    My.Settings.ScriptPDF = selectedPath
                    My.Settings.Save()

                    ' Load the PDF into the viewer (existing helper handles validation and rendering)
                    LoadPdfFromSettings()

                    ' Inform user
                    ToonFlashBericht("PDF geladen: " & Path.GetFileName(selectedPath), 3, FlashSeverity.IsInfo)
                End If
            End Using
        Catch ex As Exception
            ToonFlashBericht("Fout bij laden PDF: " & ex.Message, 8, FlashSeverity.IsError)
        End Try
    End Sub

    Private Sub DG_ActionsDetail_CellContentClick(sender As Object, e As DataGridViewCellEventArgs) Handles DG_ActionsDetail.CellContentClick

    End Sub
End Class
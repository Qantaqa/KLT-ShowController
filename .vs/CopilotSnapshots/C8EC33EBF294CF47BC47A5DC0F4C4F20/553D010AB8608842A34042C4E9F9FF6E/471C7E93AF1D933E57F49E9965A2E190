Imports System.Diagnostics.Metrics
Imports System.IO
Imports System.Net
Imports System.Runtime.InteropServices
Imports Newtonsoft.Json
Imports PdfiumViewer

Public Class FrmMain
    Public Const nextScene As Integer = 0
    Public Const nextEvent As Integer = 1

    Private lastDDPTick As DateTime = Now

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
    'Friend pdfAutoScrollTimer As Timer
    'Friend pdfAutoScrollIntervalMs As Integer = 15000 ' 15 sec per page
    Friend pdfPageUpdateTimer As Timer

    ' Importeer de functie voor het ophalen van Frame delays
    <DllImport("gdi32.dll", SetLastError:=True, ExactSpelling:=True)>
    Private Shared Function GetEnhMetaFilePixelFormat(ByVal hEmf As IntPtr) As UInteger
    End Function


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

            ' Definieer de kolommen voor de DataGridView
            Dim ipColumn As New DataGridViewTextBoxColumn
            ipColumn.Name = "colIPAddress"
            ipColumn.HeaderText = "IP Address"
            ipColumn.DataPropertyName = "IPAddress"

            Dim nameColumn As New DataGridViewTextBoxColumn
            nameColumn.Name = "colInstance"
            nameColumn.HeaderText = "WLED Name"
            nameColumn.DataPropertyName = "WLEDName"

            'DG_Devices.Columns.AddRange(ipColumn, nameColumn) ' Voeg de kolommen toe aan de DataGridView

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

            lblPreviewFromPosition.Text = 0
            lblPreviewToPosition.Text = 90

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
                        ToonFlashBericht("Alle WLED-apparaten online.", 3, FlashSeverity.IsInfo)
                    Case 1
                        ToonFlashBericht("Er is 1 WLED-apparaat offline op het netwerk.", 10, FlashSeverity.IsWarning)
                    Case Else
                        ToonFlashBericht("Er zijn " + c.ToString + " WLED-apparaten offline op het netwerk.", 10, FlashSeverity.IsWarning)
                End Select
            End If

            CurrentGroupId = -1
            CurrentDeviceId = -1

            Dim ZoomFactor As Double = 60

            EffectBuilder.Initialize(PanelTracks, DG_Tracks, DG_LightSources, ZoomFactor)
            Tracks.Initialize()
            AddHandler EffectBuilder.TrackClicked, AddressOf EffectBuilder.OnTrackClicked
            AddHandler EffectBuilder.LightSourceClicked, AddressOf EffectBuilder.OnLightSourceClicked
            AddHandler pb_Stage.MouseClick, AddressOf Stage.OnStageClick

            SetZoom(ZoomFactor)

            ' Zorg dat kolom ScriptPg bestaat in DG_Show
            If DG_Show IsNot Nothing AndAlso Not DG_Show.Columns.Contains("ScriptPg") Then
                Dim col As New DataGridViewTextBoxColumn()
                col.Name = "ScriptPg"
                col.HeaderText = "ScriptPg"
                col.Width = 60
                DG_Show.Columns.Add(col)
            End If

            ' Herstel splitter positie indien opgeslagen (>0)
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
                ' Ensure we can capture mouse wheel for page navigation
                AddHandler pbPDFViewer.MouseWheel, AddressOf pbPDFViewer_MouseWheel
                AddHandler pbPDFViewer.MouseEnter, Sub() pbPDFViewer.Focus()
            End If

            UpdateMonitorStatusIndicators(cbMonitorControl, cbMonitorPrime, cbMonitorSecond)

            If (ImagesAreEqual(pbPrimaryStatus.Image, My.Resources.iconGreenBullet1)) Then
                SetPrimaryBeamerToCorrectOutput()
                Beamer_Primary.Show()
                Beamer_Primary.FormBorderStyle = FormBorderStyle.None
                Beamer_Primary.BringToFront()
            Else
                ToonFlashBericht("Primary beamer is niet verbonden of ingesteld.", 20, FlashSeverity.IsWarning)
            End If

            If (ImagesAreEqual(pbSecondaryStatus.Image, My.Resources.iconGreenBullet1)) Then
                SetSecondairyBeamerToCorrectOutput()
                Beamer_Secondairy.Show()
                Beamer_Secondairy.FormBorderStyle = FormBorderStyle.None
                Beamer_Secondairy.BringToFront()
            Else
                ToonFlashBericht("Secondary beamer is niet verbonden of ingesteld.", 20, FlashSeverity.IsWarning)
            End If

        Catch ex As Exception
            MessageBox.Show($"Fout tijdens laden van form: {ex.Message}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End Try
    End Sub



    ' **************************************************************************************************************************
    ' EVENT HANDLERS - Klik op DG Devices en open de bijbehorende webste
    ' **************************************************************************************************************************
    Private Sub DG_Devices_CellContentClick(sender As Object, e As DataGridViewCellEventArgs) Handles DG_Devices.CellContentClick
        If (e.ColumnIndex < 2) Then
            OpenWebsiteOfWLED(Me.DG_Devices, txt_APIResult, e)
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

    Private Sub cbMonitorPrime_SelectedIndexChanged(sender As Object, e As EventArgs) Handles cbMonitorPrime.SelectedIndexChanged
        My.Settings.MonitorPrimary = cbMonitorPrime.Text
        My.Settings.Save()
    End Sub

    Private Sub cbMonitorSecond_SelectedIndexChanged(sender As Object, e As EventArgs) Handles cbMonitorSecond.SelectedIndexChanged
        My.Settings.MonitorSecond = cbMonitorSecond.Text
        My.Settings.Save()
    End Sub

    Private Sub Timer1_Tick(sender As Object, e As EventArgs) Handles TimerEverySecond.Tick
        UpdateMonitorStatusIndicators(cbMonitorControl, cbMonitorPrime, cbMonitorSecond)
        UpdateCurrentTime()
        UpdateBlinkingButton()

        lblControl_TimeLeft.Text = RemoveSecondFromStringTime(lblControl_TimeLeft.Text)
    End Sub




    Private Async Sub btnScanNetworkForWLed_Click(sender As Object, e As EventArgs) Handles btnScanNetworkForWLed.Click
        Await ScanNetworkForWLEDDevices(DG_Devices)

        ' Call your post-scan functions in order
        SplitIntoGroups(DG_Devices, DG_Groups)
        'PopulateTreeView(DG_Groups, tvGroupsSelected)
        ClearGroupsToBlack_WithDDP()
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
        Update_DGGRid_Details(DG_Show, e.RowIndex)
    End Sub

    Private Sub detailWLed_Brightness_Scroll(sender As Object, e As EventArgs) Handles detailWLed_Brightness.Scroll
        DG_Show.CurrentRow.Cells("colBrightness").Value = detailWLed_Brightness.Value
    End Sub

    Private Sub detailWLed_Intensity_Scroll(sender As Object, e As EventArgs) Handles detailWLed_Intensity.Scroll
        DG_Show.CurrentRow.Cells("colIntensity").Value = detailWLed_Intensity.Value
    End Sub

    Private Sub detailWLed_Speed_Scroll(sender As Object, e As EventArgs) Handles detailWLed_Speed.Scroll
        DG_Show.CurrentRow.Cells("colSpeed").Value = detailWLed_Speed.Value
    End Sub

    Private Sub detailWLed_Color1_Click(sender As Object, e As EventArgs) Handles detailWLed_Color1.Click
        detailWLed_Color1.BackColor = GetColorByColorWheel()
        DG_Show.CurrentRow.Cells("colColor1").Value = detailWLed_Color1.BackColor.ToArgb()
    End Sub

    Private Sub detailWLed_Color2_Click(sender As Object, e As EventArgs) Handles detailWLed_Color2.Click
        detailWLed_Color2.BackColor = GetColorByColorWheel()
        DG_Show.CurrentRow.Cells("colColor2").Value = detailWLed_Color2.BackColor.ToArgb()
    End Sub

    Private Sub detailWLed_Color3_Click(sender As Object, e As EventArgs) Handles detailWLed_Color3.Click
        detailWLed_Color3.BackColor = GetColorByColorWheel()
        DG_Show.CurrentRow.Cells("colColor3").Value = detailWLed_Color3.BackColor.ToArgb()

    End Sub

    Private Sub btnControl_Start_Click(sender As Object, e As EventArgs) Handles btnControl_Start.Click
        Start_Show(DG_Show)
    End Sub

    Private Sub TimerNextEvent_Tick(sender As Object, e As EventArgs) Handles TimerNextEvent.Tick
        EndEventTimer()
    End Sub

    Private Sub TimerPingDevices_Tick(sender As Object, e As EventArgs) Handles TimerPingDevices.Tick
        Dim C As Integer = 0
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

    Private Sub btnPingDevice_Click(sender As Object, e As EventArgs) Handles btnPingDevice.Click
        TimerPingDevices_Tick(sender, e)
    End Sub

    Private Sub btnAddDevice_Click(sender As Object, e As EventArgs) Handles btnAddDevice.Click
        DG_Devices_AddNewRowAfter_Click(DG_Devices, DG_Show, DG_Groups)
    End Sub

    Private Sub btnDeleteDevice_Click(sender As Object, e As EventArgs) Handles btnDeleteDevice.Click
        DG_Devices_RemoveCurrentRow_Click(DG_Devices)
    End Sub

    Private Sub btnLoadAll_Click(sender As Object, e As EventArgs) Handles btnLoadAll.Click
        LoadAll()
    End Sub

    'Private Sub btnLoadEffectPalettes_Click(sender As Object, e As EventArgs)
    '    LoadEffectPalettes()
    'End Sub

    Private Sub detailWLed_Effect_Paint(sender As Object, e As PaintEventArgs) Handles detailWLed_Effect.Paint
        Show_PaintEvent(sender, e)
    End Sub

    Private Sub btnTestExistanceEffects_Click(sender As Object, e As EventArgs) Handles btnTestExistanceEffects.Click
        TextExistanceEffects(DG_Effecten, My.Settings.EffectsImagePath)
    End Sub

    Private Sub btnGenerateStage_Click(sender As Object, e As EventArgs) Handles btnGenerateStage.Click
        GenereerLedLijst(DG_Devices, DG_Groups, pb_Stage, My.Settings.PodiumBreedte, My.Settings.PodiumHoogte)
        TekenPodium(pb_Stage, My.Settings.PodiumBreedte, My.Settings.PodiumHoogte)
    End Sub


    Private Sub btnUpdateStage_Click(sender As Object, e As EventArgs)

    End Sub

    Private Sub DG_Devices_CellValidated(sender As Object, e As DataGridViewCellEventArgs) Handles DG_Devices.CellValidated
        On Error Resume Next

        If (e.ColumnIndex = DG_Devices.Columns("colLayout").Index) Then

            Dim oldValue = DG_Devices.Rows(e.RowIndex).Cells(e.ColumnIndex).Value
            Dim newValue = ValidateLayoutString(oldValue)
            DG_Devices.Rows(e.RowIndex).Cells(e.ColumnIndex).Value = newValue
        End If
    End Sub

    Private Sub btnGroupAddRowAfter_Click(sender As Object, e As EventArgs) Handles btnGroupAddRowAfter.Click
        GroupAddRowAfter(DG_Groups)
    End Sub

    Private Sub btnGroupAddRowBefore_Click(sender As Object, e As EventArgs) Handles btnGroupAddRowBefore.Click
        GroupAddRowBefore(DG_Groups)
    End Sub

    Private Sub btnGroupDeleteRow_Click(sender As Object, e As EventArgs) Handles btnGroupDeleteRow.Click
        GroupDeleteRow(DG_Groups)
    End Sub



    Sub ControlOneLed(DeviceRow As DataGridViewRow, lednr As Integer, redvalue As Integer, greenvalue As Integer, bluevalue As Integer)
        Dim r As Integer = redvalue
        Dim g As Integer = greenvalue
        Dim b As Integer = bluevalue

        ' Segment voor LED 0 instellen (start 0, stop 1)
        Dim json As String = JsonConvert.SerializeObject(New With {
        .seg = New Object() {
            New With {
                .id = 0,
                .start = lednr - 1,
                .stop = lednr,
                .col = New Integer()() {New Integer() {r, g, b}}
            }
        }
    })

        Dim client As New WebClient()
        client.Headers(HttpRequestHeader.ContentType) = "application/json"

        Dim MyUrl = "http://" + DeviceRow.Cells("colIPAddress").Value + "/json/state"
        Try
            client.UploadString(MyUrl, "POST", json)
        Catch ex As Exception
            MessageBox.Show("Fout bij verzenden naar WLED: " & ex.Message)
        End Try

    End Sub

    Private Sub btnGenerateSlider_Click(sender As Object, e As EventArgs) Handles btnGenerateSliders.Click

        If (DG_Devices.CurrentRow Is Nothing) Then
            ToonFlashBericht("Selecteer eerst een device in de tabel.", 3)
            Return
        End If
        CurrentDeviceId = DG_Devices.CurrentRow.Index
        CurrentGroupId = -1
        GenerateSlidersForSelectedFixture(DG_Devices.CurrentRow, SplitContainer_Devices.Panel2)
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

    Private Sub ddpTimer_Tick(sender As Object, e As EventArgs)
        'UpdateWLEDFromSliders_DDP()
    End Sub

    Private Sub btnApplyCustomEffect_Click(sender As Object, e As EventArgs) Handles btnApplyCustomEffect.Click
        ' Effect builder
        Compile_EffectDesigner()
        'Else
        '    ' Custom effects.
        '    HandleApplyCustomEffectClick()
        'End If

    End Sub


    'Private Sub EffectColor1_Click(sender As Object, e As EventArgs)
    '    EffectColor1.BackColor = GetColorByColorWheel()
    '    My.Settings.CustomEffectC1 = EffectColor1.BackColor.ToArgb
    '    My.Settings.Save()
    'End Sub

    'Private Sub EffectColor2_Click(sender As Object, e As EventArgs)
    '    EffectColor2.BackColor = GetColorByColorWheel()
    '    My.Settings.CustomEffectC2 = EffectColor2.BackColor.ToArgb
    '    My.Settings.Save()
    'End Sub

    'Private Sub EffectColor3_Click(sender As Object, e As EventArgs)
    '    EffectColor3.BackColor = GetColorByColorWheel()
    '    My.Settings.CustomEffectC3 = EffectColor3.BackColor.ToArgb
    '    My.Settings.Save()
    'End Sub

    'Private Sub EffectColor4_Click(sender As Object, e As EventArgs)
    '    EffectColor4.BackColor = GetColorByColorWheel()
    '    My.Settings.CustomEffectC4 = EffectColor4.BackColor.ToArgb
    '    My.Settings.Save()
    'End Sub

    'Private Sub EffectColor5_Click(sender As Object, e As EventArgs)
    '    EffectColor5.BackColor = GetColorByColorWheel()
    '    My.Settings.CustomEffectC5 = EffectColor5.BackColor.ToArgb
    '    My.Settings.Save()
    'End Sub

    Private Sub btnDevicesRefreshIPs_Click(sender As Object, e As EventArgs) Handles btnDevicesRefreshIPs.Click
        RefreshIPAddresses(DG_Devices)
    End Sub

    Private Sub btnGroupsAutoSplit_Click(sender As Object, e As EventArgs) Handles btnGroupsAutoSplit.Click
        SplitIntoGroups(DG_Devices, DG_Groups)
        'PopulateTreeView(DG_Groups, tvGroupsSelected)
        ClearGroupsToBlack_WithDDP()
    End Sub

    'Private Sub tbEffectSpeed_Scroll(sender As Object, e As EventArgs)
    '    My.Settings.CustomEffectSpeed = tbEffectSpeed.Value
    '    My.Settings.Save()
    'End Sub

    'Private Sub tbEffectIntensity_Scroll(sender As Object, e As EventArgs)
    '    My.Settings.CustomEffectIntensity = tbEffectIntensity.Value
    '    My.Settings.Save()
    'End Sub

    'Private Sub tbEffectBrightness_Scroll(sender As Object, e As EventArgs)
    '    My.Settings.CustomEffectBrightness = tbEffectBrightnessBaseline.Value
    '    My.Settings.Save()
    'End Sub

    Private Sub ddpTimer_Tick_1(sender As Object, e As EventArgs) Handles ddpTimer.Tick
        lastDDPTick = DateTime.Now
        'HandleDDPTimer_Tick()
    End Sub

    Private Sub btnStartEffectPreview_Click(sender As Object, e As EventArgs) Handles btnStartEffectPreview.Click


        ' Start voor alle groepen die frames hebben
        For Each row As DataGridViewRow In DG_Groups.Rows.Cast(Of DataGridViewRow)()
            If Not row.IsNewRow Then
                Dim frames = TryCast(row.Cells("colAllFrames").Value, List(Of Byte()))
                If frames IsNot Nothing AndAlso frames.Count > 0 Then
                    Dim groupId = CInt(row.Cells("colGroupId").Value)
                    DDP.StartGroupStream(groupId)
                End If
            End If
        Next
    End Sub

    Private Sub btnStopEffectPreview_Click(sender As Object, e As EventArgs) Handles btnStopEffectPreview.Click
        ' Stop voor álle actieve groep-streamers
        For Each row As DataGridViewRow In DG_Groups.Rows.Cast(Of DataGridViewRow)()
            If Not row.IsNewRow Then
                Dim frames = TryCast(row.Cells("colAllFrames").Value, List(Of Byte()))
                If frames IsNot Nothing AndAlso frames.Count > 0 Then
                    Dim groupId = CInt(row.Cells("colGroupId").Value)
                    DDP.StopGroupStream(groupId)
                End If
            End If
        Next
    End Sub

    'Private Sub tbEffectDuration_Scroll(sender As Object, e As EventArgs)
    '    My.Settings.CustomEffectDuration = tbEffectDuration.Value
    '    My.Settings.Save()
    'End Sub

    Private Sub btnGroupDMXSlider_Click(sender As Object, e As EventArgs) Handles btnGroupDMXSlider.Click

        If (DG_Groups.CurrentRow Is Nothing) Then
            ToonFlashBericht("Selecteer eerst een groep in de tabel.", 3)
            Return
        End If

        CurrentDeviceId = -1
        CurrentGroupId = DG_Groups.CurrentRow.Cells("colGroupId").Value
        GenerateSlidersForSelectedGroup(DG_Groups.CurrentRow, SplitContainer_Devices.Panel2)
    End Sub

    Private Sub stageTimer_Tick(sender As Object, e As EventArgs) Handles stageTimer.Tick
        Try
            ' Bereken hoe lang geleden de laatste DDP werd verstuurd
            Dim sinceDDP = DateTime.Now - lastDDPTick

            ' Als DDP langer dan 1800ms geleden is, sla stage update over
            If sinceDDP.TotalMilliseconds > 1800 Then
                Debug.WriteLine("?? stageTimer tick geskipt: DDP loopt achter")
                Return
            End If

            ' Normale update
            Stage.TekenPodium(pb_Stage, My.Settings.PodiumBreedte, My.Settings.PodiumHoogte)

        Catch ex As Exception
            Debug.WriteLine("[stageTimer_Tick] Fout: " & ex.Message)
        End Try
    End Sub

    Private Sub pb_Stage_Resize(sender As Object, e As EventArgs) Handles pb_Stage.Resize
        GenereerLedLijst(DG_Devices, DG_Groups, pb_Stage, My.Settings.PodiumBreedte, My.Settings.PodiumHoogte)
    End Sub

    'Private Sub tbEffectBrightnessBaselineEffect_Scroll(sender As Object, e As EventArgs)
    '    My.Settings.CustomEffectBrightnessEffect = tbEffectBrightnessEffect.Value
    '    My.Settings.Save()
    'End Sub

    'Private Sub tbEffectDispersion_Scroll(sender As Object, e As EventArgs)
    '    My.Settings.CustomEffectDispersion = tbEffectDispersion.Value
    '    My.Settings.Save()

    'End Sub

    Private Sub btnResetEffect_Click(sender As Object, e As EventArgs) Handles btnResetEffect.Click
        ResetGroupsEffects()
        ClearGroupsToBlack_WithDDP()
    End Sub

    Private Sub btnTablesAddRowBefore_Click(sender As Object, e As EventArgs) Handles btnTablesAddRowBefore.Click
        Dim currentRowIndex As Integer = 0
        Dim ThisDGV As DataGridView

        Select Case TabControlTables.SelectedIndex
            Case 0
                ThisDGV = DG_Tracks
            Case 1
                ThisDGV = DG_Templates
            Case 2
                ThisDGV = DG_LightSources
            Case 3
                ThisDGV = DG_Frames
            Case Else
                Return
        End Select

        If ThisDGV.Rows.Count > 0 Then
            currentRowIndex = ThisDGV.CurrentCell.RowIndex
        End If
        ThisDGV.Rows.Insert(currentRowIndex, 1) 'Voegt een nieuwe rij in op de gespecificeerde index

        'Stel de focus op de nieuwe rij
        ThisDGV.CurrentCell = ThisDGV.Rows(currentRowIndex).Cells(0)
    End Sub

    Private Sub btnTablesAddRowAfter_Click(sender As Object, e As EventArgs) Handles btnTablesAddRowAfter.Click
        Dim currentRowIndex As Integer = 0
        Dim ThisDGV As DataGridView

        Select Case TabControlTables.SelectedIndex
            Case 0
                ThisDGV = DG_Tracks
            Case 1
                ThisDGV = DG_Templates
            Case 2
                ThisDGV = DG_LightSources
            Case 3
                ThisDGV = DG_Frames
            Case Else
                Return
        End Select

        If ThisDGV.Rows.Count > 0 Then
            currentRowIndex = ThisDGV.CurrentCell.RowIndex
            ThisDGV.Rows.Insert(currentRowIndex + 1, 1) 'Voegt een nieuwe rij in na de huidige rij
        Else
            ThisDGV.Rows.Insert(0, 1) 'Voegt een nieuwe rij in op de gespecificeerde index
            currentRowIndex = -1
        End If


        'Stel de focus op de nieuwe rij
        ThisDGV.CurrentCell = ThisDGV.Rows(currentRowIndex + 1).Cells(0)
    End Sub

    Private Sub btnTablesDeleteSingleRow_Click(sender As Object, e As EventArgs) Handles btnTablesDeleteSingleRow.Click
        Dim ThisDGV As DataGridView

        Select Case TabControlTables.SelectedIndex
            Case 0
                ThisDGV = DG_Tracks
            Case 1
                ThisDGV = DG_Templates
            Case 2
                ThisDGV = DG_LightSources
            Case 3
                ThisDGV = DG_Frames
            Case Else
                Return
        End Select


        If (ThisDGV.RowCount > 0) Then
            'Voeg hier de logica toe om de huidige rij te verwijderen
            Dim currentRowIndex As Integer = ThisDGV.CurrentCell.RowIndex
            If ThisDGV.Rows.Count > 0 Then
                ThisDGV.Rows.RemoveAt(currentRowIndex)
            End If
        End If
    End Sub

    Private Sub btnZoom10_Click(sender As Object, e As EventArgs) Handles btnZoom10.Click
        ZoomFactor = 10
        btnZoom10.Checked = True
        btnZoom30.Checked = False
        btnZoom60.Checked = False
        btnZoom90.Checked = False

        EffectBuilder.SetZoom(ZoomFactor)
    End Sub

    Private Sub btnZoom30_Click(sender As Object, e As EventArgs) Handles btnZoom30.Click
        ZoomFactor = 30
        btnZoom10.Checked = False
        btnZoom30.Checked = True
        btnZoom60.Checked = False
        btnZoom90.Checked = False

        EffectBuilder.SetZoom(ZoomFactor)
    End Sub

    Private Sub btnZoom60_Click(sender As Object, e As EventArgs) Handles btnZoom60.Click
        ZoomFactor = 60
        btnZoom10.Checked = False
        btnZoom30.Checked = False
        btnZoom60.Checked = True
        btnZoom90.Checked = False

        EffectBuilder.SetZoom(ZoomFactor)
    End Sub

    Private Sub btnZoom90_Click(sender As Object, e As EventArgs) Handles btnZoom90.Click
        ZoomFactor = 90
        btnZoom10.Checked = False
        btnZoom30.Checked = False
        btnZoom60.Checked = False
        btnZoom90.Checked = True

        EffectBuilder.SetZoom(ZoomFactor)
    End Sub

    Private Sub DG_Tracks_RowValidated(sender As Object, e As DataGridViewCellEventArgs) Handles DG_Tracks.RowValidated
        EffectBuilder.RefreshTimeline()
    End Sub


    Private Sub btnLoadAll_Click_1(sender As Object, e As EventArgs) Handles btnLoadAll.Click
        LoadAll()
    End Sub

    Private Sub btnResetFrames_Click(sender As Object, e As EventArgs) Handles btnResetFrames.Click
        SplitContainerStage.SplitterDistance = 171
        TekenPodium(pb_Stage, My.Settings.PodiumBreedte, My.Settings.PodiumHoogte)
    End Sub

    Private Sub cbSelectedEffect_Click(sender As Object, e As EventArgs) Handles cbSelectedEffect.Click
        Dim selectedName As String = cbSelectedEffect.Text
        If String.IsNullOrWhiteSpace(selectedName) Then Exit Sub

        For Each row As DataGridViewRow In DG_Templates.Rows
            If row.IsNewRow Then Continue For
            If CStr(row.Cells("colTemplateName").Value) = selectedName Then
                row.Selected = True
                DG_Templates.CurrentCell = row.Cells("colTemplateName")
                Exit For
            End If
        Next
    End Sub

    Private Sub BtnAddTrack_Click(sender As Object, e As EventArgs) Handles BtnAddTrack.Click
        AddTrack()
    End Sub


    Private Sub BtnRemoveTrack_Click(sender As Object, e As EventArgs) Handles BtnRemoveTrack.Click
        RemoveTrack()
    End Sub


    Private Sub btnAddShape_Click(sender As Object, e As EventArgs) Handles btnAddShape.Click
        AddShape()
    End Sub

    Private Sub btnRemoveShape_Click(sender As Object, e As EventArgs) Handles btnRemoveShape.Click
        RemoveShape()
    End Sub

    Private Sub btnEffectAdd_Click(sender As Object, e As EventArgs) Handles btnEffectAdd.Click
        AddTemplate()
    End Sub

    Private Sub btnEffectDelete_Click(sender As Object, e As EventArgs) Handles btnEffectDelete.Click
        RemoveTemplate()
    End Sub

    Private Sub btnRepeat_Click(sender As Object, e As EventArgs) Handles btnRepeat.Click
        If (btnRepeat.Checked) Then
            btnRepeat.Image = My.Resources.iconCheckbox_checked2
            btnRepeat.Checked = False
        Else
            btnRepeat.Image = My.Resources.iconCheckbox_checked
            btnRepeat.Checked = True
        End If
    End Sub

    Private Sub btnPreviewPlayPause_Click(sender As Object, e As EventArgs) Handles btnPreviewPlayPause.Click
        PreviewMarkerCurrent = lblPreviewFromPosition.Text

        If btnPreviewPlayPause.Checked Then
            btnPreviewPlayPause.Image = My.Resources.iconPause
            btnPreviewPlayPause.Checked = False
            ' Add code to pause preview
        Else
            btnPreviewPlayPause.Image = My.Resources.iconPlay
            btnPreviewPlayPause.Checked = True
            ' Add code to start preview
        End If
    End Sub

    Private Sub btnRebuildDGEffects_Click(sender As Object, e As EventArgs) Handles btnRebuildDGEffects.Click
        Update_DGEffecten_BasedOnDevices()
    End Sub

    Private Sub btnRebuildDGPalettes_Click(sender As Object, e As EventArgs) Handles btnRebuildDGPalettes.Click
        Update_DGPalettes_BasedOnDevices()
    End Sub

    Private Sub btnSendUpdatedSegmentsToWLED_Click(sender As Object, e As EventArgs) Handles btnSendUpdatedSegmentsToWLED.Click
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

        Dim FixtureString As String = rowData("colFixture").ToString().Substring(0, 2)
        If (FixtureString = "**") Then
            ' Show the details form FOR VIDEO
            Using detailsForm As New DetailShowVideo(rowData)
                If detailsForm.ShowDialog() = DialogResult.OK Then
                    ' Update the row with any changes
                    For Each col As DataGridViewColumn In DG_Show.Columns
                        row.Cells(col.Index).Value = rowData(col.Name)
                    Next
                End If
            End Using

        Else
            ' Show the details form FOR WLED
            Using detailsForm As New DetailShowWLED(rowData)
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
        Next_EventOrScene(DG_Show, nextEvent)
    End Sub

    Private Sub btnControl_NextScene_Click(sender As Object, e As EventArgs) Handles btnControl_NextScene.Click
        Next_EventOrScene(DG_Show, nextScene)
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

    Private Sub btnStopLoopingAtEndOfVideo_Click(sender As Object, e As EventArgs) Handles btnStopLoopingAtEndOfVideo.Click
        Beamer_Primary.WMP_PrimaryPlayer_Live.settings.setMode("loop", False)
        Beamer_Secondairy.WMP_SecondairyPlayer_Live.settings.setMode("loop", False)
        WMP_PrimaryPlayer_Preview.settings.setMode("loop", False)
        WMP_SecondairyPlayer_Preview.settings.setMode("loop", False)

        ToonFlashBericht("Video stopt na deze cyclus.", 5)
        TurnOnBlinkOfStopLooping()
    End Sub

    Private Sub btnControl_NextAct_Click(sender As Object, e As EventArgs) Handles btnControl_NextAct.Click
        Next_Act(DG_Show, filterAct)
    End Sub

    Private Sub btnEditTemplate_Click(sender As Object, e As EventArgs) Handles btnEditTemplate.Click
        Template.EditSelectedTemplate()
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
End Class
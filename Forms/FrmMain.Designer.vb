<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class FrmMain
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()>
    Protected Overrides Sub Dispose(disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()>
    Private Sub InitializeComponent()
        components = New ComponentModel.Container()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(FrmMain))
        Dim DataGridViewCellStyle1 As DataGridViewCellStyle = New DataGridViewCellStyle()
        Dim DataGridViewCellStyle2 As DataGridViewCellStyle = New DataGridViewCellStyle()
        DG_Effecten = New DataGridView()
        TabControl = New TabControl()
        TabShow = New TabPage()
        gbPrimaryBeamer = New GroupBox()
        warning_PrimaryBeamerOffline = New Label()
        WMP_PrimaryPlayer_Preview = New AxWMPLib.AxWindowsMediaPlayer()
        gb_MediaControl = New GroupBox()
        btnStopLoopingAtEndOfVideo = New Button()
        btn_ReconnectSecondairyBeamer = New Button()
        btn_ReconnectPrimaryBeamer = New Button()
        gb_StatusConnections = New GroupBox()
        SplitContainer2 = New SplitContainer()
        TabControlShow = New TabControl()
        TabShowSummary = New TabPage()
        GroupBox6 = New GroupBox()
        Label7 = New Label()
        Label13 = New Label()
        dg_NextLights = New DataGridView()
        Label28 = New Label()
        dg_NextActions = New DataGridView()
        Label29 = New Label()
        Label30 = New Label()
        DataGridView3 = New DataGridView()
        GroupBox5 = New GroupBox()
        lblCueToAdvance = New Label()
        GroupBox3 = New GroupBox()
        lblComments = New Label()
        lblCurrentTitle = New Label()
        dg_CurrentLights = New DataGridView()
        Label8 = New Label()
        dg_CurrentActions = New DataGridView()
        Label9 = New Label()
        Label12 = New Label()
        dg_CurrentMedia = New DataGridView()
        TabShowList = New TabPage()
        DG_Show = New DataGridView()
        btnApply = New DataGridViewButtonColumn()
        colAct = New DataGridViewComboBoxColumn()
        colSceneId = New DataGridViewTextBoxColumn()
        colEventId = New DataGridViewTextBoxColumn()
        colTimer = New DataGridViewTextBoxColumn()
        colType = New DataGridViewComboBoxColumn()
        colCue = New DataGridViewTextBoxColumn()
        colFixture = New DataGridViewComboBoxColumn()
        colStateOnOff = New DataGridViewComboBoxColumn()
        colEffectId = New DataGridViewTextBoxColumn()
        colEffect = New DataGridViewComboBoxColumn()
        colPaletteId = New DataGridViewTextBoxColumn()
        colPalette = New DataGridViewComboBoxColumn()
        colColor1 = New DataGridViewTextBoxColumn()
        colColor2 = New DataGridViewTextBoxColumn()
        colColor3 = New DataGridViewTextBoxColumn()
        colBrightness = New DataGridViewTextBoxColumn()
        colSpeed = New DataGridViewTextBoxColumn()
        colIntensity = New DataGridViewTextBoxColumn()
        colTransition = New DataGridViewTextBoxColumn()
        colBlend = New DataGridViewCheckBoxColumn()
        colRepeat = New DataGridViewCheckBoxColumn()
        colSound = New DataGridViewCheckBoxColumn()
        colFilename = New DataGridViewTextBoxColumn()
        colSend = New DataGridViewCheckBoxColumn()
        ScriptPg = New DataGridViewTextBoxColumn()
        pbPDFViewer = New PictureBox()
        gb_Controls = New GroupBox()
        lblControl_TimeLeft = New Label()
        btnControl_NextAct = New Button()
        btnControl_NextScene = New Button()
        btnControl_StopAll = New Button()
        btnControl_NextEvent = New Button()
        btnControl_Start = New Button()
        gbSecondairyBeamer = New GroupBox()
        warning_SecondairyBeamerOffline = New Label()
        WMP_SecondairyPlayer_Preview = New AxWMPLib.AxWindowsMediaPlayer()
        ToolStip_Show = New ToolStrip()
        lblFilter = New ToolStripLabel()
        filterAct = New ToolStripComboBox()
        btn_DGGrid_RemoveCurrentRow = New ToolStripButton()
        btn_DGGrid_AddNewRowAfter = New ToolStripButton()
        btn_DGGrid_AddNewRowBefore = New ToolStripButton()
        ToolStripSeparator2 = New ToolStripSeparator()
        btnLockUnlocked = New ToolStripButton()
        ToolStripSeparator10 = New ToolStripSeparator()
        ToolStripLabel7 = New ToolStripLabel()
        lblPDFPage = New ToolStripLabel()
        btnAutoGotoPDFPage = New ToolStripButton()
        ToolStripSeparator11 = New ToolStripSeparator()
        TabTables = New TabPage()
        TabControlTables = New TabControl()
        TabStageActions = New TabPage()
        ToolStripTables = New ToolStrip()
        btnTablesAddRowBefore = New ToolStripButton()
        btnTablesAddRowAfter = New ToolStripButton()
        btnTablesDeleteSingleRow = New ToolStripButton()
        ToolStripSeparator3 = New ToolStripSeparator()
        btnDeleteAllTables = New ToolStripButton()
        ToolStripSeparator5 = New ToolStripSeparator()
        SplitContainer3 = New SplitContainer()
        DG_Actions = New DataGridView()
        colActionId = New DataGridViewTextBoxColumn()
        colActionPage = New DataGridViewTextBoxColumn()
        colActionPosX = New DataGridViewTextBoxColumn()
        colActionPosY = New DataGridViewTextBoxColumn()
        colActionImage = New DataGridViewTextBoxColumn()
        DG_ActionsDetail = New DataGridView()
        colActionRowID = New DataGridViewTextBoxColumn()
        colActionRowOrder = New DataGridViewTextBoxColumn()
        colActionRowDescr = New DataGridViewTextBoxColumn()
        colActionRowActor = New DataGridViewTextBoxColumn()
        TabLedDevices = New TabPage()
        SplitContainer1 = New SplitContainer()
        DG_Devices = New DataGridView()
        colIPAddress = New DataGridViewTextBoxColumn()
        colInstance = New DataGridViewTextBoxColumn()
        colLayout = New DataGridViewTextBoxColumn()
        colLedCount = New DataGridViewTextBoxColumn()
        colSegments = New DataGridViewTextBoxColumn()
        colEffects = New DataGridViewTextBoxColumn()
        colPalettes = New DataGridViewTextBoxColumn()
        colEnabled = New DataGridViewCheckBoxColumn()
        colOnline = New DataGridViewImageColumn()
        colDDPData = New DataGridViewTextBoxColumn()
        colDDPOffset = New DataGridViewTextBoxColumn()
        colSegmentsData = New DataGridViewTextBoxColumn()
        colDataProvider = New DataGridViewComboBoxColumn()
        colBrand = New DataGridViewComboBoxColumn()
        ToolStrip_Devices = New ToolStrip()
        LblDeviceStatus = New ToolStripLabel()
        btnScanNetworkForWLed = New ToolStripButton()
        btnDevicesRefreshIPs = New ToolStripButton()
        ToolStripSeparator13 = New ToolStripSeparator()
        btnDownloadSegmentDataFromWLED = New ToolStripButton()
        btnSendUpdatedSegmentsToWLED = New ToolStripButton()
        btnDeleteDevice = New ToolStripButton()
        btnAddDevice = New ToolStripButton()
        ToolStripSeparator4 = New ToolStripSeparator()
        btnGenerateStage = New ToolStripButton()
        ToolStripSeparator12 = New ToolStripSeparator()
        ToolStripLabel8 = New ToolStripLabel()
        btnAutoPing = New ToolStripButton()
        DG_Groups = New DataGridView()
        colGroupId = New DataGridViewTextBoxColumn()
        colGroupParentId = New DataGridViewTextBoxColumn()
        colGroupName = New DataGridViewTextBoxColumn()
        colGroupFixture = New DataGridViewComboBoxColumn()
        colGroupSegment = New DataGridViewTextBoxColumn()
        colGroupStartLedNr = New DataGridViewTextBoxColumn()
        colGroupStopLedNr = New DataGridViewTextBoxColumn()
        colGroupOrder = New DataGridViewTextBoxColumn()
        colAllFrames = New DataGridViewTextBoxColumn()
        colActiveFrame = New DataGridViewTextBoxColumn()
        colGroupRepeat = New DataGridViewCheckBoxColumn()
        colGroupLayout = New DataGridViewTextBoxColumn()
        ToolStripGroups = New ToolStrip()
        btnGroupDeleteRow = New ToolStripButton()
        btnGroupAddRowBefore = New ToolStripButton()
        btnGroupAddRowAfter = New ToolStripButton()
        btnGroupsAutoSplit = New ToolStripButton()
        TabLedSegments = New TabPage()
        TabEffects = New TabPage()
        ToolStrip_Effecten = New ToolStrip()
        btnRebuildDGEffects = New ToolStripButton()
        btnTestExistanceEffects = New ToolStripButton()
        RichTextBox2 = New RichTextBox()
        TabPaletten = New TabPage()
        RichTextBox3 = New RichTextBox()
        ToolStrip_Paletten = New ToolStrip()
        btnRebuildDGPalettes = New ToolStripButton()
        ToolStripButton1 = New ToolStripButton()
        DG_Paletten = New DataGridView()
        TabSettings = New TabPage()
        gbRK_All = New GroupBox()
        Label27 = New Label()
        gbRK_BottomRight = New GroupBox()
        Label21 = New Label()
        Label22 = New Label()
        CBRK_BottomRight = New ComboBox()
        TBRK_BottomRight = New TextBox()
        gbRK_TopRight = New GroupBox()
        Label19 = New Label()
        Label20 = New Label()
        CBRK_TopRight = New ComboBox()
        TBRK_TopRight = New TextBox()
        gbRK_BottomCenter = New GroupBox()
        Label23 = New Label()
        Label24 = New Label()
        CBRK_BottomCenter = New ComboBox()
        TBRK_BottomCenter = New TextBox()
        gbRK_BottomLeft = New GroupBox()
        Label25 = New Label()
        Label26 = New Label()
        CBRK_BottomLeft = New ComboBox()
        TBRK_BottomLeft = New TextBox()
        gbRK_TopCenter = New GroupBox()
        Label17 = New Label()
        Label18 = New Label()
        CBRK_TopCenter = New ComboBox()
        TBRK_TopCenter = New TextBox()
        gbRK_TopLeft = New GroupBox()
        Label16 = New Label()
        Label15 = New Label()
        CBRK_TopLeft = New ComboBox()
        TBRK_TopLeft = New TextBox()
        GroupBox8 = New GroupBox()
        btn_ScriptPDF = New Button()
        settings_ScriptPDF = New TextBox()
        Label4 = New Label()
        Label14 = New Label()
        settings_DDPPort = New TextBox()
        settings_EffectsPath = New TextBox()
        Label11 = New Label()
        settings_PalettesPath = New TextBox()
        Label10 = New Label()
        settings_ProjectName = New TextBox()
        Label6 = New Label()
        btnProjectFolder = New Button()
        settings_ProjectFolder = New TextBox()
        Label5 = New Label()
        GroupBox4 = New GroupBox()
        txt_APIResult = New TextBox()
        GroupBox2 = New GroupBox()
        pbSecondaryStatus = New PictureBox()
        Label1 = New Label()
        pbPrimaryStatus = New PictureBox()
        cbMonitorSecond = New ComboBox()
        pbControlStatus = New PictureBox()
        cbMonitorPrime = New ComboBox()
        cbMonitorControl = New ComboBox()
        Label3 = New Label()
        Label2 = New Label()
        lblShowMonitor = New Label()
        GroupBox1 = New GroupBox()
        txtIPRange = New TextBox()
        lblIPRange = New Label()
        ToolStrip_Form = New ToolStrip()
        btnSaveShow = New ToolStripButton()
        ToolStripLabel1 = New ToolStripLabel()
        btnLoadAll = New ToolStripButton()
        TimerEverySecond = New Timer(components)
        PictureBox1 = New PictureBox()
        OpenFileDialog1 = New OpenFileDialog()
        lblTitleProject = New Label()
        lblCurrentTime = New Label()
        TimerNextEvent = New Timer(components)
        TimerPingDevices = New Timer(components)
        CType(DG_Effecten, ComponentModel.ISupportInitialize).BeginInit()
        TabControl.SuspendLayout()
        TabShow.SuspendLayout()
        gbPrimaryBeamer.SuspendLayout()
        CType(WMP_PrimaryPlayer_Preview, ComponentModel.ISupportInitialize).BeginInit()
        gb_MediaControl.SuspendLayout()
        CType(SplitContainer2, ComponentModel.ISupportInitialize).BeginInit()
        SplitContainer2.Panel1.SuspendLayout()
        SplitContainer2.Panel2.SuspendLayout()
        SplitContainer2.SuspendLayout()
        TabControlShow.SuspendLayout()
        TabShowSummary.SuspendLayout()
        GroupBox6.SuspendLayout()
        CType(dg_NextLights, ComponentModel.ISupportInitialize).BeginInit()
        CType(dg_NextActions, ComponentModel.ISupportInitialize).BeginInit()
        CType(DataGridView3, ComponentModel.ISupportInitialize).BeginInit()
        GroupBox5.SuspendLayout()
        GroupBox3.SuspendLayout()
        CType(dg_CurrentLights, ComponentModel.ISupportInitialize).BeginInit()
        CType(dg_CurrentActions, ComponentModel.ISupportInitialize).BeginInit()
        CType(dg_CurrentMedia, ComponentModel.ISupportInitialize).BeginInit()
        TabShowList.SuspendLayout()
        CType(DG_Show, ComponentModel.ISupportInitialize).BeginInit()
        CType(pbPDFViewer, ComponentModel.ISupportInitialize).BeginInit()
        gb_Controls.SuspendLayout()
        gbSecondairyBeamer.SuspendLayout()
        CType(WMP_SecondairyPlayer_Preview, ComponentModel.ISupportInitialize).BeginInit()
        ToolStip_Show.SuspendLayout()
        TabTables.SuspendLayout()
        TabControlTables.SuspendLayout()
        TabStageActions.SuspendLayout()
        ToolStripTables.SuspendLayout()
        CType(SplitContainer3, ComponentModel.ISupportInitialize).BeginInit()
        SplitContainer3.Panel1.SuspendLayout()
        SplitContainer3.Panel2.SuspendLayout()
        SplitContainer3.SuspendLayout()
        CType(DG_Actions, ComponentModel.ISupportInitialize).BeginInit()
        CType(DG_ActionsDetail, ComponentModel.ISupportInitialize).BeginInit()
        TabLedDevices.SuspendLayout()
        CType(SplitContainer1, ComponentModel.ISupportInitialize).BeginInit()
        SplitContainer1.Panel1.SuspendLayout()
        SplitContainer1.Panel2.SuspendLayout()
        SplitContainer1.SuspendLayout()
        CType(DG_Devices, ComponentModel.ISupportInitialize).BeginInit()
        ToolStrip_Devices.SuspendLayout()
        CType(DG_Groups, ComponentModel.ISupportInitialize).BeginInit()
        ToolStripGroups.SuspendLayout()
        TabEffects.SuspendLayout()
        ToolStrip_Effecten.SuspendLayout()
        TabPaletten.SuspendLayout()
        ToolStrip_Paletten.SuspendLayout()
        CType(DG_Paletten, ComponentModel.ISupportInitialize).BeginInit()
        TabSettings.SuspendLayout()
        gbRK_All.SuspendLayout()
        gbRK_BottomRight.SuspendLayout()
        gbRK_TopRight.SuspendLayout()
        gbRK_BottomCenter.SuspendLayout()
        gbRK_BottomLeft.SuspendLayout()
        gbRK_TopCenter.SuspendLayout()
        gbRK_TopLeft.SuspendLayout()
        GroupBox8.SuspendLayout()
        GroupBox4.SuspendLayout()
        GroupBox2.SuspendLayout()
        CType(pbSecondaryStatus, ComponentModel.ISupportInitialize).BeginInit()
        CType(pbPrimaryStatus, ComponentModel.ISupportInitialize).BeginInit()
        CType(pbControlStatus, ComponentModel.ISupportInitialize).BeginInit()
        GroupBox1.SuspendLayout()
        ToolStrip_Form.SuspendLayout()
        CType(PictureBox1, ComponentModel.ISupportInitialize).BeginInit()
        SuspendLayout()
        ' 
        ' DG_Effecten
        ' 
        DG_Effecten.Anchor = AnchorStyles.Top Or AnchorStyles.Bottom Or AnchorStyles.Left Or AnchorStyles.Right
        DG_Effecten.BackgroundColor = Color.DimGray
        DG_Effecten.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        DG_Effecten.Location = New Point(3, 71)
        DG_Effecten.Name = "DG_Effecten"
        DG_Effecten.RowHeadersWidth = 10
        DG_Effecten.Size = New Size(1830, 775)
        DG_Effecten.TabIndex = 2
        ' 
        ' TabControl
        ' 
        TabControl.Anchor = AnchorStyles.Top Or AnchorStyles.Bottom Or AnchorStyles.Left Or AnchorStyles.Right
        TabControl.Controls.Add(TabShow)
        TabControl.Controls.Add(TabTables)
        TabControl.Controls.Add(TabEffects)
        TabControl.Controls.Add(TabPaletten)
        TabControl.Controls.Add(TabSettings)
        TabControl.Location = New Point(0, 77)
        TabControl.Name = "TabControl"
        TabControl.SelectedIndex = 0
        TabControl.Size = New Size(1844, 877)
        TabControl.TabIndex = 3
        ' 
        ' TabShow
        ' 
        TabShow.BackColor = Color.DimGray
        TabShow.Controls.Add(gbPrimaryBeamer)
        TabShow.Controls.Add(gb_MediaControl)
        TabShow.Controls.Add(gb_StatusConnections)
        TabShow.Controls.Add(SplitContainer2)
        TabShow.Controls.Add(gb_Controls)
        TabShow.Controls.Add(gbSecondairyBeamer)
        TabShow.Controls.Add(ToolStip_Show)
        TabShow.Location = New Point(4, 24)
        TabShow.Name = "TabShow"
        TabShow.Size = New Size(1836, 849)
        TabShow.TabIndex = 2
        TabShow.Text = "Show"
        ' 
        ' gbPrimaryBeamer
        ' 
        gbPrimaryBeamer.Anchor = AnchorStyles.Bottom Or AnchorStyles.Right
        gbPrimaryBeamer.BackColor = Color.DimGray
        gbPrimaryBeamer.Controls.Add(warning_PrimaryBeamerOffline)
        gbPrimaryBeamer.Controls.Add(WMP_PrimaryPlayer_Preview)
        gbPrimaryBeamer.ForeColor = Color.MidnightBlue
        gbPrimaryBeamer.Location = New Point(1168, 661)
        gbPrimaryBeamer.Name = "gbPrimaryBeamer"
        gbPrimaryBeamer.Size = New Size(386, 188)
        gbPrimaryBeamer.TabIndex = 4
        gbPrimaryBeamer.TabStop = False
        gbPrimaryBeamer.Text = "Primary beamer - Not playing"
        ' 
        ' warning_PrimaryBeamerOffline
        ' 
        warning_PrimaryBeamerOffline.AutoSize = True
        warning_PrimaryBeamerOffline.BackColor = Color.Transparent
        warning_PrimaryBeamerOffline.FlatStyle = FlatStyle.Flat
        warning_PrimaryBeamerOffline.ForeColor = Color.Red
        warning_PrimaryBeamerOffline.Location = New Point(82, 80)
        warning_PrimaryBeamerOffline.Name = "warning_PrimaryBeamerOffline"
        warning_PrimaryBeamerOffline.Size = New Size(94, 15)
        warning_PrimaryBeamerOffline.TabIndex = 1
        warning_PrimaryBeamerOffline.Text = "DISCONNECTED"
        ' 
        ' WMP_PrimaryPlayer_Preview
        ' 
        WMP_PrimaryPlayer_Preview.Dock = DockStyle.Fill
        WMP_PrimaryPlayer_Preview.Enabled = True
        WMP_PrimaryPlayer_Preview.Location = New Point(3, 19)
        WMP_PrimaryPlayer_Preview.Name = "WMP_PrimaryPlayer_Preview"
        WMP_PrimaryPlayer_Preview.OcxState = CType(resources.GetObject("WMP_PrimaryPlayer_Preview.OcxState"), AxHost.State)
        WMP_PrimaryPlayer_Preview.Size = New Size(380, 166)
        WMP_PrimaryPlayer_Preview.TabIndex = 0
        ' 
        ' gb_MediaControl
        ' 
        gb_MediaControl.Anchor = AnchorStyles.Bottom Or AnchorStyles.Left
        gb_MediaControl.Controls.Add(btnStopLoopingAtEndOfVideo)
        gb_MediaControl.Controls.Add(btn_ReconnectSecondairyBeamer)
        gb_MediaControl.Controls.Add(btn_ReconnectPrimaryBeamer)
        gb_MediaControl.Location = New Point(561, 661)
        gb_MediaControl.Name = "gb_MediaControl"
        gb_MediaControl.Size = New Size(191, 188)
        gb_MediaControl.TabIndex = 11
        gb_MediaControl.TabStop = False
        gb_MediaControl.Text = "Media Control"
        ' 
        ' btnStopLoopingAtEndOfVideo
        ' 
        btnStopLoopingAtEndOfVideo.BackColor = Color.Black
        btnStopLoopingAtEndOfVideo.BackgroundImageLayout = ImageLayout.None
        btnStopLoopingAtEndOfVideo.ForeColor = SystemColors.ActiveCaption
        btnStopLoopingAtEndOfVideo.Location = New Point(6, 120)
        btnStopLoopingAtEndOfVideo.Name = "btnStopLoopingAtEndOfVideo"
        btnStopLoopingAtEndOfVideo.Size = New Size(176, 42)
        btnStopLoopingAtEndOfVideo.TabIndex = 7
        btnStopLoopingAtEndOfVideo.Text = "Stop looping at end of video"
        btnStopLoopingAtEndOfVideo.UseVisualStyleBackColor = False
        ' 
        ' btn_ReconnectSecondairyBeamer
        ' 
        btn_ReconnectSecondairyBeamer.BackColor = Color.Black
        btn_ReconnectSecondairyBeamer.BackgroundImageLayout = ImageLayout.None
        btn_ReconnectSecondairyBeamer.ForeColor = SystemColors.ActiveCaption
        btn_ReconnectSecondairyBeamer.Location = New Point(6, 71)
        btn_ReconnectSecondairyBeamer.Name = "btn_ReconnectSecondairyBeamer"
        btn_ReconnectSecondairyBeamer.Size = New Size(176, 42)
        btn_ReconnectSecondairyBeamer.TabIndex = 6
        btn_ReconnectSecondairyBeamer.Text = "Reconnect Secondairy Beamer"
        btn_ReconnectSecondairyBeamer.UseVisualStyleBackColor = False
        ' 
        ' btn_ReconnectPrimaryBeamer
        ' 
        btn_ReconnectPrimaryBeamer.BackColor = Color.Black
        btn_ReconnectPrimaryBeamer.BackgroundImageLayout = ImageLayout.None
        btn_ReconnectPrimaryBeamer.ForeColor = SystemColors.ActiveCaption
        btn_ReconnectPrimaryBeamer.Location = New Point(6, 21)
        btn_ReconnectPrimaryBeamer.Name = "btn_ReconnectPrimaryBeamer"
        btn_ReconnectPrimaryBeamer.Size = New Size(176, 41)
        btn_ReconnectPrimaryBeamer.TabIndex = 5
        btn_ReconnectPrimaryBeamer.Text = "Reconnect Primary Beamer"
        btn_ReconnectPrimaryBeamer.UseVisualStyleBackColor = False
        ' 
        ' gb_StatusConnections
        ' 
        gb_StatusConnections.Anchor = AnchorStyles.Bottom Or AnchorStyles.Left Or AnchorStyles.Right
        gb_StatusConnections.Location = New Point(758, 661)
        gb_StatusConnections.Name = "gb_StatusConnections"
        gb_StatusConnections.Size = New Size(404, 186)
        gb_StatusConnections.TabIndex = 10
        gb_StatusConnections.TabStop = False
        gb_StatusConnections.Text = "Connections"
        ' 
        ' SplitContainer2
        ' 
        SplitContainer2.Anchor = AnchorStyles.Top Or AnchorStyles.Bottom Or AnchorStyles.Left Or AnchorStyles.Right
        SplitContainer2.Location = New Point(3, 28)
        SplitContainer2.Name = "SplitContainer2"
        ' 
        ' SplitContainer2.Panel1
        ' 
        SplitContainer2.Panel1.Controls.Add(TabControlShow)
        ' 
        ' SplitContainer2.Panel2
        ' 
        SplitContainer2.Panel2.Controls.Add(pbPDFViewer)
        SplitContainer2.Size = New Size(1833, 627)
        SplitContainer2.SplitterDistance = 1161
        SplitContainer2.TabIndex = 8
        ' 
        ' TabControlShow
        ' 
        TabControlShow.Controls.Add(TabShowSummary)
        TabControlShow.Controls.Add(TabShowList)
        TabControlShow.Dock = DockStyle.Fill
        TabControlShow.Location = New Point(0, 0)
        TabControlShow.Name = "TabControlShow"
        TabControlShow.SelectedIndex = 0
        TabControlShow.Size = New Size(1161, 627)
        TabControlShow.TabIndex = 1
        ' 
        ' TabShowSummary
        ' 
        TabShowSummary.BackColor = Color.Black
        TabShowSummary.Controls.Add(GroupBox6)
        TabShowSummary.Controls.Add(GroupBox5)
        TabShowSummary.Controls.Add(GroupBox3)
        TabShowSummary.Location = New Point(4, 24)
        TabShowSummary.Name = "TabShowSummary"
        TabShowSummary.Padding = New Padding(3)
        TabShowSummary.Size = New Size(1153, 599)
        TabShowSummary.TabIndex = 0
        TabShowSummary.Text = "Summary"
        ' 
        ' GroupBox6
        ' 
        GroupBox6.Anchor = AnchorStyles.Top Or AnchorStyles.Bottom Or AnchorStyles.Left Or AnchorStyles.Right
        GroupBox6.BackColor = Color.Black
        GroupBox6.Controls.Add(Label7)
        GroupBox6.Controls.Add(Label13)
        GroupBox6.Controls.Add(dg_NextLights)
        GroupBox6.Controls.Add(Label28)
        GroupBox6.Controls.Add(dg_NextActions)
        GroupBox6.Controls.Add(Label29)
        GroupBox6.Controls.Add(Label30)
        GroupBox6.Controls.Add(DataGridView3)
        GroupBox6.ForeColor = SystemColors.ActiveCaption
        GroupBox6.Location = New Point(3, 372)
        GroupBox6.Name = "GroupBox6"
        GroupBox6.Size = New Size(1144, 221)
        GroupBox6.TabIndex = 20
        GroupBox6.TabStop = False
        GroupBox6.Text = "Next Event/Scene"
        ' 
        ' Label7
        ' 
        Label7.Location = New Point(11, 37)
        Label7.Name = "Label7"
        Label7.Size = New Size(1059, 30)
        Label7.TabIndex = 11
        Label7.Text = "..."
        ' 
        ' Label13
        ' 
        Label13.AutoSize = True
        Label13.Font = New Font("Segoe UI Semibold", 12F, FontStyle.Bold, GraphicsUnit.Point, CByte(0))
        Label13.Location = New Point(11, 16)
        Label13.Name = "Label13"
        Label13.Size = New Size(22, 21)
        Label13.TabIndex = 10
        Label13.Text = "..."
        ' 
        ' dg_NextLights
        ' 
        dg_NextLights.BackgroundColor = Color.Black
        dg_NextLights.BorderStyle = BorderStyle.Fixed3D
        dg_NextLights.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        dg_NextLights.GridColor = Color.DimGray
        dg_NextLights.Location = New Point(505, 85)
        dg_NextLights.Name = "dg_NextLights"
        dg_NextLights.Size = New Size(310, 125)
        dg_NextLights.TabIndex = 7
        ' 
        ' Label28
        ' 
        Label28.AutoSize = True
        Label28.Location = New Point(11, 67)
        Label28.Name = "Label28"
        Label28.Size = New Size(50, 15)
        Label28.TabIndex = 2
        Label28.Text = "Actions:"
        ' 
        ' dg_NextActions
        ' 
        dg_NextActions.BackgroundColor = Color.Black
        dg_NextActions.BorderStyle = BorderStyle.Fixed3D
        dg_NextActions.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        dg_NextActions.GridColor = Color.DimGray
        dg_NextActions.Location = New Point(11, 85)
        dg_NextActions.Name = "dg_NextActions"
        dg_NextActions.Size = New Size(488, 125)
        dg_NextActions.TabIndex = 5
        ' 
        ' Label29
        ' 
        Label29.AutoSize = True
        Label29.Location = New Point(505, 67)
        Label29.Name = "Label29"
        Label29.Size = New Size(42, 15)
        Label29.TabIndex = 6
        Label29.Text = "Lights:"
        ' 
        ' Label30
        ' 
        Label30.AutoSize = True
        Label30.Location = New Point(828, 67)
        Label30.Name = "Label30"
        Label30.Size = New Size(43, 15)
        Label30.TabIndex = 8
        Label30.Text = "Media:"
        ' 
        ' DataGridView3
        ' 
        DataGridView3.BackgroundColor = Color.Black
        DataGridView3.BorderStyle = BorderStyle.Fixed3D
        DataGridView3.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        DataGridView3.GridColor = Color.DimGray
        DataGridView3.Location = New Point(828, 85)
        DataGridView3.Name = "DataGridView3"
        DataGridView3.Size = New Size(310, 125)
        DataGridView3.TabIndex = 9
        ' 
        ' GroupBox5
        ' 
        GroupBox5.Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Right
        GroupBox5.BackColor = Color.Black
        GroupBox5.Controls.Add(lblCueToAdvance)
        GroupBox5.ForeColor = SystemColors.ActiveCaption
        GroupBox5.Location = New Point(3, 233)
        GroupBox5.Name = "GroupBox5"
        GroupBox5.Size = New Size(1147, 133)
        GroupBox5.TabIndex = 19
        GroupBox5.TabStop = False
        GroupBox5.Text = "Cue to advance to next Scene/Event"
        ' 
        ' lblCueToAdvance
        ' 
        lblCueToAdvance.AutoSize = True
        lblCueToAdvance.Font = New Font("Segoe UI Semibold", 12F, FontStyle.Bold, GraphicsUnit.Point, CByte(0))
        lblCueToAdvance.Location = New Point(11, 19)
        lblCueToAdvance.Name = "lblCueToAdvance"
        lblCueToAdvance.Size = New Size(22, 21)
        lblCueToAdvance.TabIndex = 11
        lblCueToAdvance.Text = "..."
        ' 
        ' GroupBox3
        ' 
        GroupBox3.Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Right
        GroupBox3.BackColor = Color.Black
        GroupBox3.Controls.Add(lblComments)
        GroupBox3.Controls.Add(lblCurrentTitle)
        GroupBox3.Controls.Add(dg_CurrentLights)
        GroupBox3.Controls.Add(Label8)
        GroupBox3.Controls.Add(dg_CurrentActions)
        GroupBox3.Controls.Add(Label9)
        GroupBox3.Controls.Add(Label12)
        GroupBox3.Controls.Add(dg_CurrentMedia)
        GroupBox3.ForeColor = SystemColors.ActiveCaption
        GroupBox3.Location = New Point(5, 6)
        GroupBox3.Name = "GroupBox3"
        GroupBox3.Size = New Size(1142, 221)
        GroupBox3.TabIndex = 18
        GroupBox3.TabStop = False
        GroupBox3.Text = "Current Scene/Event"
        ' 
        ' lblComments
        ' 
        lblComments.Location = New Point(11, 37)
        lblComments.Name = "lblComments"
        lblComments.Size = New Size(1059, 30)
        lblComments.TabIndex = 11
        lblComments.Text = "..."
        ' 
        ' lblCurrentTitle
        ' 
        lblCurrentTitle.AutoSize = True
        lblCurrentTitle.Font = New Font("Segoe UI Semibold", 12F, FontStyle.Bold, GraphicsUnit.Point, CByte(0))
        lblCurrentTitle.Location = New Point(11, 16)
        lblCurrentTitle.Name = "lblCurrentTitle"
        lblCurrentTitle.Size = New Size(22, 21)
        lblCurrentTitle.TabIndex = 10
        lblCurrentTitle.Text = "..."
        ' 
        ' dg_CurrentLights
        ' 
        dg_CurrentLights.BackgroundColor = Color.Black
        dg_CurrentLights.BorderStyle = BorderStyle.Fixed3D
        dg_CurrentLights.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        dg_CurrentLights.GridColor = Color.DimGray
        dg_CurrentLights.Location = New Point(503, 85)
        dg_CurrentLights.Name = "dg_CurrentLights"
        dg_CurrentLights.Size = New Size(310, 125)
        dg_CurrentLights.TabIndex = 7
        ' 
        ' Label8
        ' 
        Label8.AutoSize = True
        Label8.Location = New Point(11, 67)
        Label8.Name = "Label8"
        Label8.Size = New Size(50, 15)
        Label8.TabIndex = 2
        Label8.Text = "Actions:"
        ' 
        ' dg_CurrentActions
        ' 
        dg_CurrentActions.BackgroundColor = Color.Black
        dg_CurrentActions.BorderStyle = BorderStyle.Fixed3D
        dg_CurrentActions.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        dg_CurrentActions.GridColor = Color.DimGray
        dg_CurrentActions.Location = New Point(11, 85)
        dg_CurrentActions.Name = "dg_CurrentActions"
        dg_CurrentActions.Size = New Size(486, 125)
        dg_CurrentActions.TabIndex = 5
        ' 
        ' Label9
        ' 
        Label9.AutoSize = True
        Label9.Location = New Point(503, 67)
        Label9.Name = "Label9"
        Label9.Size = New Size(42, 15)
        Label9.TabIndex = 6
        Label9.Text = "Lights:"
        ' 
        ' Label12
        ' 
        Label12.AutoSize = True
        Label12.Location = New Point(826, 67)
        Label12.Name = "Label12"
        Label12.Size = New Size(43, 15)
        Label12.TabIndex = 8
        Label12.Text = "Media:"
        ' 
        ' dg_CurrentMedia
        ' 
        dg_CurrentMedia.BackgroundColor = Color.Black
        dg_CurrentMedia.BorderStyle = BorderStyle.Fixed3D
        dg_CurrentMedia.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        dg_CurrentMedia.GridColor = Color.DimGray
        dg_CurrentMedia.Location = New Point(826, 85)
        dg_CurrentMedia.Name = "dg_CurrentMedia"
        dg_CurrentMedia.Size = New Size(310, 125)
        dg_CurrentMedia.TabIndex = 9
        ' 
        ' TabShowList
        ' 
        TabShowList.BackColor = Color.Black
        TabShowList.Controls.Add(DG_Show)
        TabShowList.Location = New Point(4, 24)
        TabShowList.Name = "TabShowList"
        TabShowList.Padding = New Padding(3)
        TabShowList.Size = New Size(1153, 599)
        TabShowList.TabIndex = 1
        TabShowList.Text = "List"
        ' 
        ' DG_Show
        ' 
        DG_Show.AllowUserToAddRows = False
        DG_Show.AllowUserToDeleteRows = False
        DG_Show.AllowUserToResizeRows = False
        DG_Show.BackgroundColor = Color.FromArgb(CByte(64), CByte(64), CByte(64))
        DG_Show.ColumnHeadersHeight = 24
        DG_Show.Columns.AddRange(New DataGridViewColumn() {btnApply, colAct, colSceneId, colEventId, colTimer, colType, colCue, colFixture, colStateOnOff, colEffectId, colEffect, colPaletteId, colPalette, colColor1, colColor2, colColor3, colBrightness, colSpeed, colIntensity, colTransition, colBlend, colRepeat, colSound, colFilename, colSend, ScriptPg})
        DG_Show.Dock = DockStyle.Fill
        DG_Show.Location = New Point(3, 3)
        DG_Show.Name = "DG_Show"
        DG_Show.RowHeadersWidth = 25
        DG_Show.Size = New Size(1147, 593)
        DG_Show.TabIndex = 0
        ' 
        ' btnApply
        ' 
        btnApply.HeaderText = "Apply"
        btnApply.Name = "btnApply"
        btnApply.Resizable = DataGridViewTriState.False
        btnApply.Text = ">>>"
        btnApply.Width = 25
        ' 
        ' colAct
        ' 
        colAct.HeaderText = "Act"
        colAct.Items.AddRange(New Object() {"Pre-Show", "Act 1", "Pauze", "Act 2", "Act 3", "Post-Show"})
        colAct.Name = "colAct"
        colAct.Resizable = DataGridViewTriState.True
        colAct.SortMode = DataGridViewColumnSortMode.Automatic
        colAct.ToolTipText = "De hoofdindeling van de show. "
        colAct.Width = 50
        ' 
        ' colSceneId
        ' 
        DataGridViewCellStyle1.Format = "N0"
        DataGridViewCellStyle1.NullValue = Nothing
        colSceneId.DefaultCellStyle = DataGridViewCellStyle1
        colSceneId.HeaderText = "Scene"
        colSceneId.Name = "colSceneId"
        colSceneId.ToolTipText = "Scene nummer van de show"
        colSceneId.Width = 50
        ' 
        ' colEventId
        ' 
        DataGridViewCellStyle2.Format = "N0"
        DataGridViewCellStyle2.NullValue = Nothing
        colEventId.DefaultCellStyle = DataGridViewCellStyle2
        colEventId.HeaderText = "Event"
        colEventId.Name = "colEventId"
        colEventId.ToolTipText = "Het event nummer binnen een scene."
        colEventId.Width = 50
        ' 
        ' colTimer
        ' 
        colTimer.HeaderText = "Timer"
        colTimer.Name = "colTimer"
        colTimer.ToolTipText = "Aantal msec voordat we naar volgende event gaan."
        colTimer.Width = 50
        ' 
        ' colType
        ' 
        colType.HeaderText = "Type"
        colType.Items.AddRange(New Object() {"Cue", "Light", "Media", "Action", "Title", "Comment"})
        colType.Name = "colType"
        colType.Width = 75
        ' 
        ' colCue
        ' 
        colCue.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
        colCue.HeaderText = "Description"
        colCue.Name = "colCue"
        ' 
        ' colFixture
        ' 
        colFixture.HeaderText = "Device/Segment"
        colFixture.Name = "colFixture"
        colFixture.Resizable = DataGridViewTriState.True
        colFixture.SortMode = DataGridViewColumnSortMode.Automatic
        ' 
        ' colStateOnOff
        ' 
        colStateOnOff.HeaderText = "Aan/Uit"
        colStateOnOff.Items.AddRange(New Object() {"Aan", "Uit"})
        colStateOnOff.Name = "colStateOnOff"
        colStateOnOff.Width = 50
        ' 
        ' colEffectId
        ' 
        colEffectId.FillWeight = 25F
        colEffectId.HeaderText = "ID"
        colEffectId.Name = "colEffectId"
        colEffectId.Visible = False
        colEffectId.Width = 25
        ' 
        ' colEffect
        ' 
        colEffect.HeaderText = "Effect"
        colEffect.Name = "colEffect"
        colEffect.Resizable = DataGridViewTriState.True
        colEffect.SortMode = DataGridViewColumnSortMode.Automatic
        ' 
        ' colPaletteId
        ' 
        colPaletteId.FillWeight = 25F
        colPaletteId.HeaderText = "ID"
        colPaletteId.Name = "colPaletteId"
        colPaletteId.Visible = False
        colPaletteId.Width = 25
        ' 
        ' colPalette
        ' 
        colPalette.HeaderText = "Palette"
        colPalette.Name = "colPalette"
        colPalette.Resizable = DataGridViewTriState.True
        colPalette.SortMode = DataGridViewColumnSortMode.Automatic
        ' 
        ' colColor1
        ' 
        colColor1.HeaderText = "Kleur 1"
        colColor1.Name = "colColor1"
        colColor1.Visible = False
        colColor1.Width = 50
        ' 
        ' colColor2
        ' 
        colColor2.HeaderText = "Kleur 2"
        colColor2.Name = "colColor2"
        colColor2.Visible = False
        colColor2.Width = 50
        ' 
        ' colColor3
        ' 
        colColor3.HeaderText = "Kleur 3"
        colColor3.Name = "colColor3"
        colColor3.Visible = False
        colColor3.Width = 50
        ' 
        ' colBrightness
        ' 
        colBrightness.HeaderText = "Brightness"
        colBrightness.Name = "colBrightness"
        colBrightness.Visible = False
        colBrightness.Width = 50
        ' 
        ' colSpeed
        ' 
        colSpeed.HeaderText = "Snelheid"
        colSpeed.Name = "colSpeed"
        colSpeed.Visible = False
        colSpeed.Width = 50
        ' 
        ' colIntensity
        ' 
        colIntensity.HeaderText = "Intensiteit"
        colIntensity.Name = "colIntensity"
        colIntensity.Visible = False
        colIntensity.Width = 50
        ' 
        ' colTransition
        ' 
        colTransition.HeaderText = "Transition"
        colTransition.Name = "colTransition"
        colTransition.Visible = False
        colTransition.Width = 50
        ' 
        ' colBlend
        ' 
        colBlend.HeaderText = "Blend"
        colBlend.Name = "colBlend"
        colBlend.Resizable = DataGridViewTriState.True
        colBlend.SortMode = DataGridViewColumnSortMode.Automatic
        colBlend.Visible = False
        colBlend.Width = 50
        ' 
        ' colRepeat
        ' 
        colRepeat.HeaderText = "Repeat"
        colRepeat.Name = "colRepeat"
        colRepeat.Resizable = DataGridViewTriState.True
        colRepeat.SortMode = DataGridViewColumnSortMode.Automatic
        colRepeat.Width = 50
        ' 
        ' colSound
        ' 
        colSound.HeaderText = "Geluid"
        colSound.Name = "colSound"
        colSound.Resizable = DataGridViewTriState.True
        colSound.SortMode = DataGridViewColumnSortMode.Automatic
        colSound.Width = 50
        ' 
        ' colFilename
        ' 
        colFilename.HeaderText = "MP4"
        colFilename.Name = "colFilename"
        colFilename.Visible = False
        colFilename.Width = 200
        ' 
        ' colSend
        ' 
        colSend.HeaderText = "Send"
        colSend.Name = "colSend"
        colSend.Width = 50
        ' 
        ' ScriptPg
        ' 
        ScriptPg.HeaderText = "Paginanr"
        ScriptPg.Name = "ScriptPg"
        ScriptPg.Width = 50
        ' 
        ' pbPDFViewer
        ' 
        pbPDFViewer.Anchor = AnchorStyles.Top Or AnchorStyles.Bottom Or AnchorStyles.Left Or AnchorStyles.Right
        pbPDFViewer.Location = New Point(0, 0)
        pbPDFViewer.Name = "pbPDFViewer"
        pbPDFViewer.Size = New Size(647, 627)
        pbPDFViewer.TabIndex = 0
        pbPDFViewer.TabStop = False
        ' 
        ' gb_Controls
        ' 
        gb_Controls.Anchor = AnchorStyles.Bottom Or AnchorStyles.Left
        gb_Controls.AutoSize = True
        gb_Controls.Controls.Add(lblControl_TimeLeft)
        gb_Controls.Controls.Add(btnControl_NextAct)
        gb_Controls.Controls.Add(btnControl_NextScene)
        gb_Controls.Controls.Add(btnControl_StopAll)
        gb_Controls.Controls.Add(btnControl_NextEvent)
        gb_Controls.Controls.Add(btnControl_Start)
        gb_Controls.ForeColor = SystemColors.ControlText
        gb_Controls.Location = New Point(3, 661)
        gb_Controls.Name = "gb_Controls"
        gb_Controls.Size = New Size(552, 188)
        gb_Controls.TabIndex = 7
        gb_Controls.TabStop = False
        gb_Controls.Text = "Show controls"
        ' 
        ' lblControl_TimeLeft
        ' 
        lblControl_TimeLeft.BackColor = Color.Black
        lblControl_TimeLeft.BorderStyle = BorderStyle.Fixed3D
        lblControl_TimeLeft.FlatStyle = FlatStyle.Flat
        lblControl_TimeLeft.ForeColor = Color.White
        lblControl_TimeLeft.Image = My.Resources.Resources.iconTime
        lblControl_TimeLeft.ImageAlign = ContentAlignment.MiddleLeft
        lblControl_TimeLeft.Location = New Point(6, 75)
        lblControl_TimeLeft.Name = "lblControl_TimeLeft"
        lblControl_TimeLeft.Size = New Size(176, 39)
        lblControl_TimeLeft.TabIndex = 3
        lblControl_TimeLeft.Text = "00:00"
        lblControl_TimeLeft.TextAlign = ContentAlignment.MiddleRight
        ' 
        ' btnControl_NextAct
        ' 
        btnControl_NextAct.BackColor = Color.Black
        btnControl_NextAct.ForeColor = Color.White
        btnControl_NextAct.Image = CType(resources.GetObject("btnControl_NextAct.Image"), Image)
        btnControl_NextAct.ImageAlign = ContentAlignment.MiddleRight
        btnControl_NextAct.Location = New Point(188, 125)
        btnControl_NextAct.Name = "btnControl_NextAct"
        btnControl_NextAct.Size = New Size(176, 41)
        btnControl_NextAct.TabIndex = 8
        btnControl_NextAct.Text = "Volgende act"
        btnControl_NextAct.UseVisualStyleBackColor = False
        ' 
        ' btnControl_NextScene
        ' 
        btnControl_NextScene.BackColor = Color.Black
        btnControl_NextScene.ForeColor = Color.White
        btnControl_NextScene.Image = My.Resources.Resources.iconFastForward
        btnControl_NextScene.ImageAlign = ContentAlignment.MiddleRight
        btnControl_NextScene.Location = New Point(188, 21)
        btnControl_NextScene.Name = "btnControl_NextScene"
        btnControl_NextScene.Size = New Size(176, 41)
        btnControl_NextScene.TabIndex = 2
        btnControl_NextScene.Text = "Volgende scene"
        btnControl_NextScene.UseVisualStyleBackColor = False
        ' 
        ' btnControl_StopAll
        ' 
        btnControl_StopAll.BackColor = Color.Black
        btnControl_StopAll.ForeColor = Color.White
        btnControl_StopAll.Image = My.Resources.Resources.iconCancel
        btnControl_StopAll.ImageAlign = ContentAlignment.MiddleRight
        btnControl_StopAll.Location = New Point(370, 22)
        btnControl_StopAll.Name = "btnControl_StopAll"
        btnControl_StopAll.Size = New Size(176, 41)
        btnControl_StopAll.TabIndex = 4
        btnControl_StopAll.Text = "Stop / Blackout"
        btnControl_StopAll.UseVisualStyleBackColor = False
        ' 
        ' btnControl_NextEvent
        ' 
        btnControl_NextEvent.BackColor = Color.Black
        btnControl_NextEvent.ForeColor = Color.White
        btnControl_NextEvent.Image = My.Resources.Resources.iconPlay
        btnControl_NextEvent.ImageAlign = ContentAlignment.MiddleRight
        btnControl_NextEvent.Location = New Point(188, 74)
        btnControl_NextEvent.Name = "btnControl_NextEvent"
        btnControl_NextEvent.Size = New Size(176, 41)
        btnControl_NextEvent.TabIndex = 1
        btnControl_NextEvent.Text = "Volgende event"
        btnControl_NextEvent.UseVisualStyleBackColor = False
        ' 
        ' btnControl_Start
        ' 
        btnControl_Start.BackColor = Color.Black
        btnControl_Start.ForeColor = Color.White
        btnControl_Start.Image = My.Resources.Resources.iconChecked
        btnControl_Start.ImageAlign = ContentAlignment.MiddleLeft
        btnControl_Start.Location = New Point(6, 21)
        btnControl_Start.Name = "btnControl_Start"
        btnControl_Start.Size = New Size(176, 40)
        btnControl_Start.TabIndex = 0
        btnControl_Start.Text = "Start"
        btnControl_Start.UseVisualStyleBackColor = False
        ' 
        ' gbSecondairyBeamer
        ' 
        gbSecondairyBeamer.Anchor = AnchorStyles.Bottom Or AnchorStyles.Right
        gbSecondairyBeamer.Controls.Add(warning_SecondairyBeamerOffline)
        gbSecondairyBeamer.Controls.Add(WMP_SecondairyPlayer_Preview)
        gbSecondairyBeamer.ForeColor = Color.MidnightBlue
        gbSecondairyBeamer.Location = New Point(1560, 661)
        gbSecondairyBeamer.Name = "gbSecondairyBeamer"
        gbSecondairyBeamer.Size = New Size(273, 186)
        gbSecondairyBeamer.TabIndex = 5
        gbSecondairyBeamer.TabStop = False
        gbSecondairyBeamer.Text = "Secondairy beamer - not playing"
        ' 
        ' warning_SecondairyBeamerOffline
        ' 
        warning_SecondairyBeamerOffline.AutoSize = True
        warning_SecondairyBeamerOffline.BackColor = Color.Transparent
        warning_SecondairyBeamerOffline.FlatStyle = FlatStyle.Flat
        warning_SecondairyBeamerOffline.ForeColor = Color.Red
        warning_SecondairyBeamerOffline.Location = New Point(89, 86)
        warning_SecondairyBeamerOffline.Name = "warning_SecondairyBeamerOffline"
        warning_SecondairyBeamerOffline.Size = New Size(94, 15)
        warning_SecondairyBeamerOffline.TabIndex = 2
        warning_SecondairyBeamerOffline.Text = "DISCONNECTED"
        ' 
        ' WMP_SecondairyPlayer_Preview
        ' 
        WMP_SecondairyPlayer_Preview.Dock = DockStyle.Fill
        WMP_SecondairyPlayer_Preview.Enabled = True
        WMP_SecondairyPlayer_Preview.Location = New Point(3, 19)
        WMP_SecondairyPlayer_Preview.Name = "WMP_SecondairyPlayer_Preview"
        WMP_SecondairyPlayer_Preview.OcxState = CType(resources.GetObject("WMP_SecondairyPlayer_Preview.OcxState"), AxHost.State)
        WMP_SecondairyPlayer_Preview.Size = New Size(267, 164)
        WMP_SecondairyPlayer_Preview.TabIndex = 0
        ' 
        ' ToolStip_Show
        ' 
        ToolStip_Show.BackColor = Color.MidnightBlue
        ToolStip_Show.GripStyle = ToolStripGripStyle.Hidden
        ToolStip_Show.Items.AddRange(New ToolStripItem() {lblFilter, filterAct, btn_DGGrid_RemoveCurrentRow, btn_DGGrid_AddNewRowAfter, btn_DGGrid_AddNewRowBefore, ToolStripSeparator2, btnLockUnlocked, ToolStripSeparator10, ToolStripLabel7, lblPDFPage, btnAutoGotoPDFPage, ToolStripSeparator11})
        ToolStip_Show.Location = New Point(0, 0)
        ToolStip_Show.Name = "ToolStip_Show"
        ToolStip_Show.Size = New Size(1836, 25)
        ToolStip_Show.TabIndex = 3
        ToolStip_Show.Text = "ToolStrip_Show"
        ' 
        ' lblFilter
        ' 
        lblFilter.ForeColor = SystemColors.ControlLightLight
        lblFilter.Image = My.Resources.Resources.filter
        lblFilter.Name = "lblFilter"
        lblFilter.Size = New Size(88, 22)
        lblFilter.Text = "Filter op act:"
        ' 
        ' filterAct
        ' 
        filterAct.Items.AddRange(New Object() {"", "Pre-Show", "Act 1", "Pauze", "Act 2", "Act 3", "Post-Show"})
        filterAct.Name = "filterAct"
        filterAct.Size = New Size(121, 25)
        ' 
        ' btn_DGGrid_RemoveCurrentRow
        ' 
        btn_DGGrid_RemoveCurrentRow.Alignment = ToolStripItemAlignment.Right
        btn_DGGrid_RemoveCurrentRow.DisplayStyle = ToolStripItemDisplayStyle.Image
        btn_DGGrid_RemoveCurrentRow.Image = CType(resources.GetObject("btn_DGGrid_RemoveCurrentRow.Image"), Image)
        btn_DGGrid_RemoveCurrentRow.ImageTransparentColor = Color.Magenta
        btn_DGGrid_RemoveCurrentRow.Name = "btn_DGGrid_RemoveCurrentRow"
        btn_DGGrid_RemoveCurrentRow.Size = New Size(23, 22)
        btn_DGGrid_RemoveCurrentRow.Text = "Verwijder huidige regel"
        btn_DGGrid_RemoveCurrentRow.ToolTipText = "Verwijder de geselecteerde regel"
        ' 
        ' btn_DGGrid_AddNewRowAfter
        ' 
        btn_DGGrid_AddNewRowAfter.Alignment = ToolStripItemAlignment.Right
        btn_DGGrid_AddNewRowAfter.DisplayStyle = ToolStripItemDisplayStyle.Image
        btn_DGGrid_AddNewRowAfter.Image = CType(resources.GetObject("btn_DGGrid_AddNewRowAfter.Image"), Image)
        btn_DGGrid_AddNewRowAfter.ImageTransparentColor = Color.Magenta
        btn_DGGrid_AddNewRowAfter.Name = "btn_DGGrid_AddNewRowAfter"
        btn_DGGrid_AddNewRowAfter.Size = New Size(23, 22)
        btn_DGGrid_AddNewRowAfter.Text = "Toevoegen regel na huidige regel"
        btn_DGGrid_AddNewRowAfter.ToolTipText = "Voeg een regel in na de huidige regel."
        ' 
        ' btn_DGGrid_AddNewRowBefore
        ' 
        btn_DGGrid_AddNewRowBefore.Alignment = ToolStripItemAlignment.Right
        btn_DGGrid_AddNewRowBefore.DisplayStyle = ToolStripItemDisplayStyle.Image
        btn_DGGrid_AddNewRowBefore.Image = CType(resources.GetObject("btn_DGGrid_AddNewRowBefore.Image"), Image)
        btn_DGGrid_AddNewRowBefore.ImageTransparentColor = Color.Magenta
        btn_DGGrid_AddNewRowBefore.Name = "btn_DGGrid_AddNewRowBefore"
        btn_DGGrid_AddNewRowBefore.Size = New Size(23, 22)
        btn_DGGrid_AddNewRowBefore.Text = "Toevoegen voor huidige regel"
        btn_DGGrid_AddNewRowBefore.TextImageRelation = TextImageRelation.ImageAboveText
        btn_DGGrid_AddNewRowBefore.ToolTipText = "Voeg een regel in voor huidige regel."
        ' 
        ' ToolStripSeparator2
        ' 
        ToolStripSeparator2.Alignment = ToolStripItemAlignment.Right
        ToolStripSeparator2.Name = "ToolStripSeparator2"
        ToolStripSeparator2.Size = New Size(6, 25)
        ' 
        ' btnLockUnlocked
        ' 
        btnLockUnlocked.Alignment = ToolStripItemAlignment.Right
        btnLockUnlocked.ForeColor = SystemColors.ControlLightLight
        btnLockUnlocked.Image = My.Resources.Resources.iconUnlocked_Green
        btnLockUnlocked.ImageTransparentColor = Color.Magenta
        btnLockUnlocked.Name = "btnLockUnlocked"
        btnLockUnlocked.Size = New Size(77, 22)
        btnLockUnlocked.Text = "Unlocked"
        ' 
        ' ToolStripSeparator10
        ' 
        ToolStripSeparator10.Name = "ToolStripSeparator10"
        ToolStripSeparator10.Size = New Size(6, 25)
        ' 
        ' ToolStripLabel7
        ' 
        ToolStripLabel7.ForeColor = SystemColors.ActiveCaption
        ToolStripLabel7.Name = "ToolStripLabel7"
        ToolStripLabel7.Size = New Size(54, 22)
        ToolStripLabel7.Text = "At page: "
        ' 
        ' lblPDFPage
        ' 
        lblPDFPage.ForeColor = SystemColors.ButtonFace
        lblPDFPage.Name = "lblPDFPage"
        lblPDFPage.Size = New Size(23, 22)
        lblPDFPage.Text = "n.a"
        ' 
        ' btnAutoGotoPDFPage
        ' 
        btnAutoGotoPDFPage.Checked = True
        btnAutoGotoPDFPage.CheckState = CheckState.Checked
        btnAutoGotoPDFPage.ForeColor = SystemColors.ButtonFace
        btnAutoGotoPDFPage.Image = My.Resources.Resources.icon_toggle_on
        btnAutoGotoPDFPage.ImageTransparentColor = Color.Magenta
        btnAutoGotoPDFPage.Name = "btnAutoGotoPDFPage"
        btnAutoGotoPDFPage.Size = New Size(41, 22)
        btnAutoGotoPDFPage.Text = "on"
        ' 
        ' ToolStripSeparator11
        ' 
        ToolStripSeparator11.Name = "ToolStripSeparator11"
        ToolStripSeparator11.Size = New Size(6, 25)
        ' 
        ' TabTables
        ' 
        TabTables.Controls.Add(TabControlTables)
        TabTables.Location = New Point(4, 24)
        TabTables.Name = "TabTables"
        TabTables.Size = New Size(1836, 849)
        TabTables.TabIndex = 9
        TabTables.Text = "Tables"
        TabTables.UseVisualStyleBackColor = True
        ' 
        ' TabControlTables
        ' 
        TabControlTables.Controls.Add(TabStageActions)
        TabControlTables.Controls.Add(TabLedDevices)
        TabControlTables.Controls.Add(TabLedSegments)
        TabControlTables.Dock = DockStyle.Fill
        TabControlTables.Location = New Point(0, 0)
        TabControlTables.Name = "TabControlTables"
        TabControlTables.SelectedIndex = 0
        TabControlTables.Size = New Size(1836, 849)
        TabControlTables.TabIndex = 0
        ' 
        ' TabStageActions
        ' 
        TabStageActions.Controls.Add(ToolStripTables)
        TabStageActions.Controls.Add(SplitContainer3)
        TabStageActions.Location = New Point(4, 24)
        TabStageActions.Name = "TabStageActions"
        TabStageActions.Size = New Size(1828, 821)
        TabStageActions.TabIndex = 4
        TabStageActions.Text = "Stage Actions"
        TabStageActions.UseVisualStyleBackColor = True
        ' 
        ' ToolStripTables
        ' 
        ToolStripTables.BackColor = Color.MidnightBlue
        ToolStripTables.GripStyle = ToolStripGripStyle.Hidden
        ToolStripTables.Items.AddRange(New ToolStripItem() {btnTablesAddRowBefore, btnTablesAddRowAfter, btnTablesDeleteSingleRow, ToolStripSeparator3, btnDeleteAllTables, ToolStripSeparator5})
        ToolStripTables.Location = New Point(0, 0)
        ToolStripTables.Name = "ToolStripTables"
        ToolStripTables.Size = New Size(1828, 25)
        ToolStripTables.TabIndex = 2
        ToolStripTables.Text = "ToolStrip1"
        ' 
        ' btnTablesAddRowBefore
        ' 
        btnTablesAddRowBefore.DisplayStyle = ToolStripItemDisplayStyle.Image
        btnTablesAddRowBefore.Image = My.Resources.Resources.iconRowAddBefore
        btnTablesAddRowBefore.ImageTransparentColor = Color.Magenta
        btnTablesAddRowBefore.Name = "btnTablesAddRowBefore"
        btnTablesAddRowBefore.Size = New Size(23, 22)
        btnTablesAddRowBefore.Text = "Add before"
        ' 
        ' btnTablesAddRowAfter
        ' 
        btnTablesAddRowAfter.DisplayStyle = ToolStripItemDisplayStyle.Image
        btnTablesAddRowAfter.Image = My.Resources.Resources.iconRowAddAfter
        btnTablesAddRowAfter.ImageTransparentColor = Color.Magenta
        btnTablesAddRowAfter.Name = "btnTablesAddRowAfter"
        btnTablesAddRowAfter.Size = New Size(23, 22)
        btnTablesAddRowAfter.Text = "Add row after"
        ' 
        ' btnTablesDeleteSingleRow
        ' 
        btnTablesDeleteSingleRow.DisplayStyle = ToolStripItemDisplayStyle.Image
        btnTablesDeleteSingleRow.Image = My.Resources.Resources.iconRowDelete
        btnTablesDeleteSingleRow.ImageTransparentColor = Color.Magenta
        btnTablesDeleteSingleRow.Name = "btnTablesDeleteSingleRow"
        btnTablesDeleteSingleRow.Size = New Size(23, 22)
        btnTablesDeleteSingleRow.Text = "Delete row"
        ' 
        ' ToolStripSeparator3
        ' 
        ToolStripSeparator3.Name = "ToolStripSeparator3"
        ToolStripSeparator3.Size = New Size(6, 25)
        ' 
        ' btnDeleteAllTables
        ' 
        btnDeleteAllTables.Alignment = ToolStripItemAlignment.Right
        btnDeleteAllTables.DisplayStyle = ToolStripItemDisplayStyle.Text
        btnDeleteAllTables.ForeColor = SystemColors.ButtonFace
        btnDeleteAllTables.Image = CType(resources.GetObject("btnDeleteAllTables.Image"), Image)
        btnDeleteAllTables.ImageTransparentColor = Color.Magenta
        btnDeleteAllTables.Name = "btnDeleteAllTables"
        btnDeleteAllTables.Size = New Size(59, 22)
        btnDeleteAllTables.Text = "Delete all"
        ' 
        ' ToolStripSeparator5
        ' 
        ToolStripSeparator5.Alignment = ToolStripItemAlignment.Right
        ToolStripSeparator5.Name = "ToolStripSeparator5"
        ToolStripSeparator5.Size = New Size(6, 25)
        ' 
        ' SplitContainer3
        ' 
        SplitContainer3.Dock = DockStyle.Bottom
        SplitContainer3.Location = New Point(0, 0)
        SplitContainer3.Name = "SplitContainer3"
        ' 
        ' SplitContainer3.Panel1
        ' 
        SplitContainer3.Panel1.Controls.Add(DG_Actions)
        ' 
        ' SplitContainer3.Panel2
        ' 
        SplitContainer3.Panel2.Controls.Add(DG_ActionsDetail)
        SplitContainer3.Size = New Size(1828, 821)
        SplitContainer3.SplitterDistance = 542
        SplitContainer3.TabIndex = 1
        ' 
        ' DG_Actions
        ' 
        DG_Actions.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        DG_Actions.Columns.AddRange(New DataGridViewColumn() {colActionId, colActionPage, colActionPosX, colActionPosY, colActionImage})
        DG_Actions.Dock = DockStyle.Fill
        DG_Actions.Location = New Point(0, 0)
        DG_Actions.Name = "DG_Actions"
        DG_Actions.Size = New Size(542, 821)
        DG_Actions.TabIndex = 0
        ' 
        ' colActionId
        ' 
        colActionId.HeaderText = "ID"
        colActionId.Name = "colActionId"
        ' 
        ' colActionPage
        ' 
        colActionPage.HeaderText = "Page"
        colActionPage.Name = "colActionPage"
        ' 
        ' colActionPosX
        ' 
        colActionPosX.HeaderText = "PosX"
        colActionPosX.Name = "colActionPosX"
        ' 
        ' colActionPosY
        ' 
        colActionPosY.HeaderText = "PosY"
        colActionPosY.Name = "colActionPosY"
        ' 
        ' colActionImage
        ' 
        colActionImage.HeaderText = "Preview"
        colActionImage.Name = "colActionImage"
        ' 
        ' DG_ActionsDetail
        ' 
        DG_ActionsDetail.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        DG_ActionsDetail.Columns.AddRange(New DataGridViewColumn() {colActionRowID, colActionRowOrder, colActionRowDescr, colActionRowActor})
        DG_ActionsDetail.Dock = DockStyle.Fill
        DG_ActionsDetail.Location = New Point(0, 0)
        DG_ActionsDetail.Name = "DG_ActionsDetail"
        DG_ActionsDetail.Size = New Size(1282, 821)
        DG_ActionsDetail.TabIndex = 0
        ' 
        ' colActionRowID
        ' 
        colActionRowID.HeaderText = "ID"
        colActionRowID.Name = "colActionRowID"
        colActionRowID.Visible = False
        ' 
        ' colActionRowOrder
        ' 
        colActionRowOrder.HeaderText = "VolgNr"
        colActionRowOrder.Name = "colActionRowOrder"
        ' 
        ' colActionRowDescr
        ' 
        colActionRowDescr.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
        colActionRowDescr.HeaderText = "Omschrijving"
        colActionRowDescr.Name = "colActionRowDescr"
        ' 
        ' colActionRowActor
        ' 
        colActionRowActor.HeaderText = "Wie"
        colActionRowActor.Name = "colActionRowActor"
        colActionRowActor.Width = 400
        ' 
        ' TabLedDevices
        ' 
        TabLedDevices.Controls.Add(SplitContainer1)
        TabLedDevices.Location = New Point(4, 24)
        TabLedDevices.Name = "TabLedDevices"
        TabLedDevices.Padding = New Padding(3)
        TabLedDevices.Size = New Size(1828, 821)
        TabLedDevices.TabIndex = 5
        TabLedDevices.Text = "Led Devices"
        TabLedDevices.UseVisualStyleBackColor = True
        ' 
        ' SplitContainer1
        ' 
        SplitContainer1.Dock = DockStyle.Fill
        SplitContainer1.Location = New Point(3, 3)
        SplitContainer1.Name = "SplitContainer1"
        ' 
        ' SplitContainer1.Panel1
        ' 
        SplitContainer1.Panel1.Controls.Add(DG_Devices)
        SplitContainer1.Panel1.Controls.Add(ToolStrip_Devices)
        ' 
        ' SplitContainer1.Panel2
        ' 
        SplitContainer1.Panel2.Controls.Add(DG_Groups)
        SplitContainer1.Panel2.Controls.Add(ToolStripGroups)
        SplitContainer1.Size = New Size(1822, 815)
        SplitContainer1.SplitterDistance = 1077
        SplitContainer1.TabIndex = 4
        ' 
        ' DG_Devices
        ' 
        DG_Devices.BackgroundColor = Color.DimGray
        DG_Devices.Columns.AddRange(New DataGridViewColumn() {colIPAddress, colInstance, colLayout, colLedCount, colSegments, colEffects, colPalettes, colEnabled, colOnline, colDDPData, colDDPOffset, colSegmentsData, colDataProvider, colBrand})
        DG_Devices.Dock = DockStyle.Bottom
        DG_Devices.Location = New Point(0, 28)
        DG_Devices.MultiSelect = False
        DG_Devices.Name = "DG_Devices"
        DG_Devices.RowHeadersWidth = 10
        DG_Devices.Size = New Size(1077, 787)
        DG_Devices.TabIndex = 5
        ' 
        ' colIPAddress
        ' 
        colIPAddress.HeaderText = "IP"
        colIPAddress.Name = "colIPAddress"
        colIPAddress.Width = 200
        ' 
        ' colInstance
        ' 
        colInstance.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
        colInstance.HeaderText = "WLed Instantie"
        colInstance.Name = "colInstance"
        ' 
        ' colLayout
        ' 
        colLayout.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
        colLayout.HeaderText = "Layout"
        colLayout.Name = "colLayout"
        colLayout.Resizable = DataGridViewTriState.True
        colLayout.SortMode = DataGridViewColumnSortMode.NotSortable
        ' 
        ' colLedCount
        ' 
        colLedCount.HeaderText = "#Leds"
        colLedCount.Name = "colLedCount"
        colLedCount.Width = 63
        ' 
        ' colSegments
        ' 
        colSegments.HeaderText = "Segments"
        colSegments.Name = "colSegments"
        ' 
        ' colEffects
        ' 
        colEffects.HeaderText = "Effects"
        colEffects.MaxInputLength = 65535
        colEffects.Name = "colEffects"
        ' 
        ' colPalettes
        ' 
        colPalettes.HeaderText = "Palettes"
        colPalettes.MaxInputLength = 65535
        colPalettes.Name = "colPalettes"
        ' 
        ' colEnabled
        ' 
        colEnabled.HeaderText = "Enabled"
        colEnabled.Name = "colEnabled"
        colEnabled.Width = 55
        ' 
        ' colOnline
        ' 
        colOnline.HeaderText = "Online"
        colOnline.Name = "colOnline"
        colOnline.Width = 48
        ' 
        ' colDDPData
        ' 
        colDDPData.HeaderText = "Data"
        colDDPData.Name = "colDDPData"
        colDDPData.Visible = False
        ' 
        ' colDDPOffset
        ' 
        colDDPOffset.HeaderText = "Offset"
        colDDPOffset.Name = "colDDPOffset"
        colDDPOffset.Visible = False
        ' 
        ' colSegmentsData
        ' 
        colSegmentsData.HeaderText = "SegmentData"
        colSegmentsData.Name = "colSegmentsData"
        colSegmentsData.Visible = False
        ' 
        ' colDataProvider
        ' 
        colDataProvider.HeaderText = "Source"
        colDataProvider.Items.AddRange(New Object() {"DMX", "Effects", "Show"})
        colDataProvider.MaxDropDownItems = 3
        colDataProvider.Name = "colDataProvider"
        colDataProvider.Resizable = DataGridViewTriState.True
        colDataProvider.SortMode = DataGridViewColumnSortMode.Automatic
        colDataProvider.Visible = False
        ' 
        ' colBrand
        ' 
        colBrand.HeaderText = "Brand"
        colBrand.Items.AddRange(New Object() {"WLED", "WIZ"})
        colBrand.Name = "colBrand"
        ' 
        ' ToolStrip_Devices
        ' 
        ToolStrip_Devices.BackColor = Color.MidnightBlue
        ToolStrip_Devices.Font = New Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point, CByte(0))
        ToolStrip_Devices.GripStyle = ToolStripGripStyle.Hidden
        ToolStrip_Devices.Items.AddRange(New ToolStripItem() {LblDeviceStatus, btnScanNetworkForWLed, btnDevicesRefreshIPs, ToolStripSeparator13, btnDownloadSegmentDataFromWLED, btnSendUpdatedSegmentsToWLED, btnDeleteDevice, btnAddDevice, ToolStripSeparator4, btnGenerateStage, ToolStripSeparator12, ToolStripLabel8, btnAutoPing})
        ToolStrip_Devices.Location = New Point(0, 0)
        ToolStrip_Devices.Name = "ToolStrip_Devices"
        ToolStrip_Devices.Size = New Size(1077, 25)
        ToolStrip_Devices.TabIndex = 4
        ToolStrip_Devices.Text = "ToolStrip_Devices"
        ' 
        ' LblDeviceStatus
        ' 
        LblDeviceStatus.Alignment = ToolStripItemAlignment.Right
        LblDeviceStatus.Name = "LblDeviceStatus"
        LblDeviceStatus.Size = New Size(0, 22)
        ' 
        ' btnScanNetworkForWLed
        ' 
        btnScanNetworkForWLed.BackColor = Color.Transparent
        btnScanNetworkForWLed.ForeColor = Color.White
        btnScanNetworkForWLed.Image = My.Resources.Resources.search_web
        btnScanNetworkForWLed.ImageTransparentColor = Color.Magenta
        btnScanNetworkForWLed.Name = "btnScanNetworkForWLed"
        btnScanNetworkForWLed.Size = New Size(192, 22)
        btnScanNetworkForWLed.Text = "Scan network for WLED devices"
        ' 
        ' btnDevicesRefreshIPs
        ' 
        btnDevicesRefreshIPs.ForeColor = SystemColors.ButtonFace
        btnDevicesRefreshIPs.Image = My.Resources.Resources.refresh
        btnDevicesRefreshIPs.ImageTransparentColor = Color.Magenta
        btnDevicesRefreshIPs.Name = "btnDevicesRefreshIPs"
        btnDevicesRefreshIPs.Size = New Size(87, 22)
        btnDevicesRefreshIPs.Text = "Refresh IP's"
        ' 
        ' ToolStripSeparator13
        ' 
        ToolStripSeparator13.Name = "ToolStripSeparator13"
        ToolStripSeparator13.Size = New Size(6, 25)
        ' 
        ' btnDownloadSegmentDataFromWLED
        ' 
        btnDownloadSegmentDataFromWLED.ForeColor = SystemColors.ControlLightLight
        btnDownloadSegmentDataFromWLED.Image = My.Resources.Resources.download_box
        btnDownloadSegmentDataFromWLED.ImageTransparentColor = Color.Magenta
        btnDownloadSegmentDataFromWLED.Name = "btnDownloadSegmentDataFromWLED"
        btnDownloadSegmentDataFromWLED.Size = New Size(216, 22)
        btnDownloadSegmentDataFromWLED.Text = "Download segmentdata from WLED"
        ' 
        ' btnSendUpdatedSegmentsToWLED
        ' 
        btnSendUpdatedSegmentsToWLED.ForeColor = SystemColors.ControlLightLight
        btnSendUpdatedSegmentsToWLED.Image = My.Resources.Resources.upload_box
        btnSendUpdatedSegmentsToWLED.ImageTransparentColor = Color.Magenta
        btnSendUpdatedSegmentsToWLED.Name = "btnSendUpdatedSegmentsToWLED"
        btnSendUpdatedSegmentsToWLED.Size = New Size(185, 22)
        btnSendUpdatedSegmentsToWLED.Text = "Upload segmentdata to WLED"
        ' 
        ' btnDeleteDevice
        ' 
        btnDeleteDevice.Alignment = ToolStripItemAlignment.Right
        btnDeleteDevice.DisplayStyle = ToolStripItemDisplayStyle.Image
        btnDeleteDevice.Image = CType(resources.GetObject("btnDeleteDevice.Image"), Image)
        btnDeleteDevice.ImageTransparentColor = Color.Magenta
        btnDeleteDevice.Name = "btnDeleteDevice"
        btnDeleteDevice.Size = New Size(23, 22)
        btnDeleteDevice.Text = "Delete device"
        ' 
        ' btnAddDevice
        ' 
        btnAddDevice.Alignment = ToolStripItemAlignment.Right
        btnAddDevice.DisplayStyle = ToolStripItemDisplayStyle.Image
        btnAddDevice.Image = CType(resources.GetObject("btnAddDevice.Image"), Image)
        btnAddDevice.ImageTransparentColor = Color.Magenta
        btnAddDevice.Name = "btnAddDevice"
        btnAddDevice.Size = New Size(23, 22)
        btnAddDevice.Text = "Insert device"
        ' 
        ' ToolStripSeparator4
        ' 
        ToolStripSeparator4.Name = "ToolStripSeparator4"
        ToolStripSeparator4.Size = New Size(6, 25)
        ' 
        ' btnGenerateStage
        ' 
        btnGenerateStage.ForeColor = SystemColors.ButtonFace
        btnGenerateStage.Image = My.Resources.Resources.calculator_variant
        btnGenerateStage.ImageTransparentColor = Color.Magenta
        btnGenerateStage.Name = "btnGenerateStage"
        btnGenerateStage.Size = New Size(105, 22)
        btnGenerateStage.Text = "Generate stage"
        ' 
        ' ToolStripSeparator12
        ' 
        ToolStripSeparator12.Name = "ToolStripSeparator12"
        ToolStripSeparator12.Size = New Size(6, 25)
        ' 
        ' ToolStripLabel8
        ' 
        ToolStripLabel8.ForeColor = SystemColors.ActiveCaption
        ToolStripLabel8.Name = "ToolStripLabel8"
        ToolStripLabel8.Size = New Size(83, 22)
        ToolStripLabel8.Text = "Continue ping"
        ' 
        ' btnAutoPing
        ' 
        btnAutoPing.ForeColor = SystemColors.ButtonHighlight
        btnAutoPing.Image = My.Resources.Resources.icon_toggle_off
        btnAutoPing.ImageTransparentColor = Color.Magenta
        btnAutoPing.Name = "btnAutoPing"
        btnAutoPing.Size = New Size(42, 22)
        btnAutoPing.Text = "off"
        ' 
        ' DG_Groups
        ' 
        DG_Groups.AllowUserToAddRows = False
        DG_Groups.AllowUserToDeleteRows = False
        DG_Groups.BackgroundColor = Color.DimGray
        DG_Groups.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        DG_Groups.Columns.AddRange(New DataGridViewColumn() {colGroupId, colGroupParentId, colGroupName, colGroupFixture, colGroupSegment, colGroupStartLedNr, colGroupStopLedNr, colGroupOrder, colAllFrames, colActiveFrame, colGroupRepeat, colGroupLayout})
        DG_Groups.Dock = DockStyle.Bottom
        DG_Groups.Location = New Point(0, 28)
        DG_Groups.Name = "DG_Groups"
        DG_Groups.RowHeadersWidth = 11
        DG_Groups.Size = New Size(741, 787)
        DG_Groups.TabIndex = 4
        ' 
        ' colGroupId
        ' 
        colGroupId.HeaderText = "ID"
        colGroupId.Name = "colGroupId"
        colGroupId.Width = 50
        ' 
        ' colGroupParentId
        ' 
        colGroupParentId.HeaderText = "Parent"
        colGroupParentId.Name = "colGroupParentId"
        colGroupParentId.Width = 50
        ' 
        ' colGroupName
        ' 
        colGroupName.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
        colGroupName.HeaderText = "Groupname"
        colGroupName.Name = "colGroupName"
        ' 
        ' colGroupFixture
        ' 
        colGroupFixture.HeaderText = "Fixture"
        colGroupFixture.Name = "colGroupFixture"
        colGroupFixture.Width = 300
        ' 
        ' colGroupSegment
        ' 
        colGroupSegment.HeaderText = "Segment"
        colGroupSegment.Name = "colGroupSegment"
        colGroupSegment.Width = 300
        ' 
        ' colGroupStartLedNr
        ' 
        colGroupStartLedNr.HeaderText = "Start Led"
        colGroupStartLedNr.Name = "colGroupStartLedNr"
        ' 
        ' colGroupStopLedNr
        ' 
        colGroupStopLedNr.HeaderText = "Stop Led"
        colGroupStopLedNr.Name = "colGroupStopLedNr"
        ' 
        ' colGroupOrder
        ' 
        colGroupOrder.HeaderText = "Order"
        colGroupOrder.Name = "colGroupOrder"
        ' 
        ' colAllFrames
        ' 
        colAllFrames.HeaderText = "Frames"
        colAllFrames.Name = "colAllFrames"
        ' 
        ' colActiveFrame
        ' 
        colActiveFrame.HeaderText = "ActiveFrame"
        colActiveFrame.Name = "colActiveFrame"
        ' 
        ' colGroupRepeat
        ' 
        colGroupRepeat.HeaderText = "Repeat"
        colGroupRepeat.Name = "colGroupRepeat"
        ' 
        ' colGroupLayout
        ' 
        colGroupLayout.HeaderText = "Layout"
        colGroupLayout.Name = "colGroupLayout"
        ' 
        ' ToolStripGroups
        ' 
        ToolStripGroups.BackColor = Color.MidnightBlue
        ToolStripGroups.GripStyle = ToolStripGripStyle.Hidden
        ToolStripGroups.Items.AddRange(New ToolStripItem() {btnGroupDeleteRow, btnGroupAddRowBefore, btnGroupAddRowAfter, btnGroupsAutoSplit})
        ToolStripGroups.Location = New Point(0, 0)
        ToolStripGroups.Name = "ToolStripGroups"
        ToolStripGroups.Size = New Size(741, 25)
        ToolStripGroups.TabIndex = 3
        ToolStripGroups.Text = "DMS Slider"
        ' 
        ' btnGroupDeleteRow
        ' 
        btnGroupDeleteRow.Alignment = ToolStripItemAlignment.Right
        btnGroupDeleteRow.DisplayStyle = ToolStripItemDisplayStyle.Image
        btnGroupDeleteRow.Image = My.Resources.Resources.iconRowDelete
        btnGroupDeleteRow.ImageTransparentColor = Color.Magenta
        btnGroupDeleteRow.Name = "btnGroupDeleteRow"
        btnGroupDeleteRow.Size = New Size(23, 22)
        btnGroupDeleteRow.Text = "Remove row"
        ' 
        ' btnGroupAddRowBefore
        ' 
        btnGroupAddRowBefore.Alignment = ToolStripItemAlignment.Right
        btnGroupAddRowBefore.DisplayStyle = ToolStripItemDisplayStyle.Image
        btnGroupAddRowBefore.Image = My.Resources.Resources.iconRowAddBefore
        btnGroupAddRowBefore.ImageTransparentColor = Color.Magenta
        btnGroupAddRowBefore.Name = "btnGroupAddRowBefore"
        btnGroupAddRowBefore.Size = New Size(23, 22)
        btnGroupAddRowBefore.Text = "Add row before"
        ' 
        ' btnGroupAddRowAfter
        ' 
        btnGroupAddRowAfter.Alignment = ToolStripItemAlignment.Right
        btnGroupAddRowAfter.DisplayStyle = ToolStripItemDisplayStyle.Image
        btnGroupAddRowAfter.Image = My.Resources.Resources.iconRowAddAfter
        btnGroupAddRowAfter.ImageTransparentColor = Color.Magenta
        btnGroupAddRowAfter.Name = "btnGroupAddRowAfter"
        btnGroupAddRowAfter.Size = New Size(23, 22)
        btnGroupAddRowAfter.Text = "Add row after"
        ' 
        ' btnGroupsAutoSplit
        ' 
        btnGroupsAutoSplit.ForeColor = SystemColors.ButtonFace
        btnGroupsAutoSplit.Image = My.Resources.Resources.call_split
        btnGroupsAutoSplit.ImageTransparentColor = Color.Magenta
        btnGroupsAutoSplit.Name = "btnGroupsAutoSplit"
        btnGroupsAutoSplit.Size = New Size(79, 22)
        btnGroupsAutoSplit.Text = "Auto Split"
        ' 
        ' TabLedSegments
        ' 
        TabLedSegments.Location = New Point(4, 24)
        TabLedSegments.Name = "TabLedSegments"
        TabLedSegments.Padding = New Padding(3)
        TabLedSegments.Size = New Size(1828, 821)
        TabLedSegments.TabIndex = 6
        TabLedSegments.Text = "Led Segments"
        TabLedSegments.UseVisualStyleBackColor = True
        ' 
        ' TabEffects
        ' 
        TabEffects.BackColor = Color.DimGray
        TabEffects.Controls.Add(ToolStrip_Effecten)
        TabEffects.Controls.Add(RichTextBox2)
        TabEffects.Controls.Add(DG_Effecten)
        TabEffects.Location = New Point(4, 24)
        TabEffects.Name = "TabEffects"
        TabEffects.Padding = New Padding(3)
        TabEffects.Size = New Size(1836, 849)
        TabEffects.TabIndex = 1
        TabEffects.Text = "Effecten"
        ' 
        ' ToolStrip_Effecten
        ' 
        ToolStrip_Effecten.BackColor = Color.MidnightBlue
        ToolStrip_Effecten.GripStyle = ToolStripGripStyle.Hidden
        ToolStrip_Effecten.Items.AddRange(New ToolStripItem() {btnRebuildDGEffects, btnTestExistanceEffects})
        ToolStrip_Effecten.Location = New Point(3, 3)
        ToolStrip_Effecten.Name = "ToolStrip_Effecten"
        ToolStrip_Effecten.Size = New Size(1830, 25)
        ToolStrip_Effecten.TabIndex = 4
        ToolStrip_Effecten.Text = "ToolStrip2"
        ' 
        ' btnRebuildDGEffects
        ' 
        btnRebuildDGEffects.DisplayStyle = ToolStripItemDisplayStyle.Text
        btnRebuildDGEffects.ForeColor = SystemColors.ControlLightLight
        btnRebuildDGEffects.Image = CType(resources.GetObject("btnRebuildDGEffects.Image"), Image)
        btnRebuildDGEffects.ImageTransparentColor = Color.Magenta
        btnRebuildDGEffects.Name = "btnRebuildDGEffects"
        btnRebuildDGEffects.Size = New Size(51, 22)
        btnRebuildDGEffects.Text = "Rebuild"
        ' 
        ' btnTestExistanceEffects
        ' 
        btnTestExistanceEffects.DisplayStyle = ToolStripItemDisplayStyle.Text
        btnTestExistanceEffects.ForeColor = SystemColors.ControlLightLight
        btnTestExistanceEffects.Image = CType(resources.GetObject("btnTestExistanceEffects.Image"), Image)
        btnTestExistanceEffects.ImageTransparentColor = Color.Magenta
        btnTestExistanceEffects.Name = "btnTestExistanceEffects"
        btnTestExistanceEffects.Size = New Size(35, 22)
        btnTestExistanceEffects.Text = "Test "
        ' 
        ' RichTextBox2
        ' 
        RichTextBox2.Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Right
        RichTextBox2.BackColor = Color.DimGray
        RichTextBox2.BorderStyle = BorderStyle.None
        RichTextBox2.Location = New Point(3, 31)
        RichTextBox2.Name = "RichTextBox2"
        RichTextBox2.ReadOnly = True
        RichTextBox2.Size = New Size(1463, 34)
        RichTextBox2.TabIndex = 3
        RichTextBox2.Text = "Hier vindt u de beschikbare effecten die een specifieke WLED aan kan. " & vbLf & "U kunt het effect toepassen op het eerste segment door op het checkbox te dubbelklikken."
        ' 
        ' TabPaletten
        ' 
        TabPaletten.BackColor = Color.DimGray
        TabPaletten.Controls.Add(RichTextBox3)
        TabPaletten.Controls.Add(ToolStrip_Paletten)
        TabPaletten.Controls.Add(DG_Paletten)
        TabPaletten.Location = New Point(4, 24)
        TabPaletten.Name = "TabPaletten"
        TabPaletten.Padding = New Padding(3)
        TabPaletten.Size = New Size(1836, 849)
        TabPaletten.TabIndex = 3
        TabPaletten.Text = "Paletten"
        ' 
        ' RichTextBox3
        ' 
        RichTextBox3.Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Right
        RichTextBox3.BackColor = Color.DimGray
        RichTextBox3.BorderStyle = BorderStyle.None
        RichTextBox3.Location = New Point(3, 31)
        RichTextBox3.Name = "RichTextBox3"
        RichTextBox3.ReadOnly = True
        RichTextBox3.Size = New Size(1463, 29)
        RichTextBox3.TabIndex = 2
        RichTextBox3.Text = "Hier vindt u de beschikbare pallet met kleuren die toegepast kunnen worden. Door op een vinkje te klikken past u het palette toe op het eerste segment van dat WLED device."
        ' 
        ' ToolStrip_Paletten
        ' 
        ToolStrip_Paletten.BackColor = Color.MidnightBlue
        ToolStrip_Paletten.GripStyle = ToolStripGripStyle.Hidden
        ToolStrip_Paletten.Items.AddRange(New ToolStripItem() {btnRebuildDGPalettes, ToolStripButton1})
        ToolStrip_Paletten.Location = New Point(3, 3)
        ToolStrip_Paletten.Name = "ToolStrip_Paletten"
        ToolStrip_Paletten.Size = New Size(1830, 25)
        ToolStrip_Paletten.TabIndex = 1
        ToolStrip_Paletten.Text = "ToolStrip1"
        ' 
        ' btnRebuildDGPalettes
        ' 
        btnRebuildDGPalettes.DisplayStyle = ToolStripItemDisplayStyle.Text
        btnRebuildDGPalettes.ForeColor = SystemColors.ControlLightLight
        btnRebuildDGPalettes.Image = CType(resources.GetObject("btnRebuildDGPalettes.Image"), Image)
        btnRebuildDGPalettes.ImageTransparentColor = Color.Magenta
        btnRebuildDGPalettes.Name = "btnRebuildDGPalettes"
        btnRebuildDGPalettes.Size = New Size(51, 22)
        btnRebuildDGPalettes.Text = "Rebuild"
        ' 
        ' ToolStripButton1
        ' 
        ToolStripButton1.DisplayStyle = ToolStripItemDisplayStyle.Text
        ToolStripButton1.ForeColor = SystemColors.ControlLightLight
        ToolStripButton1.Image = My.Resources.Resources.iconBlackBullet1
        ToolStripButton1.ImageTransparentColor = Color.Magenta
        ToolStripButton1.Name = "ToolStripButton1"
        ToolStripButton1.Size = New Size(32, 22)
        ToolStripButton1.Text = "Test"
        ' 
        ' DG_Paletten
        ' 
        DG_Paletten.Anchor = AnchorStyles.Top Or AnchorStyles.Bottom Or AnchorStyles.Left Or AnchorStyles.Right
        DG_Paletten.BackgroundColor = Color.DimGray
        DG_Paletten.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
        DG_Paletten.Location = New Point(6, 66)
        DG_Paletten.Name = "DG_Paletten"
        DG_Paletten.RowHeadersWidth = 10
        DG_Paletten.Size = New Size(1827, 780)
        DG_Paletten.TabIndex = 0
        ' 
        ' TabSettings
        ' 
        TabSettings.BackColor = Color.DimGray
        TabSettings.Controls.Add(gbRK_All)
        TabSettings.Controls.Add(GroupBox8)
        TabSettings.Controls.Add(GroupBox4)
        TabSettings.Controls.Add(GroupBox2)
        TabSettings.Controls.Add(GroupBox1)
        TabSettings.Location = New Point(4, 24)
        TabSettings.Name = "TabSettings"
        TabSettings.Padding = New Padding(3)
        TabSettings.Size = New Size(1836, 849)
        TabSettings.TabIndex = 4
        TabSettings.Text = "Settings"
        ' 
        ' gbRK_All
        ' 
        gbRK_All.Controls.Add(Label27)
        gbRK_All.Controls.Add(gbRK_BottomRight)
        gbRK_All.Controls.Add(gbRK_TopRight)
        gbRK_All.Controls.Add(gbRK_BottomCenter)
        gbRK_All.Controls.Add(gbRK_BottomLeft)
        gbRK_All.Controls.Add(gbRK_TopCenter)
        gbRK_All.Controls.Add(gbRK_TopLeft)
        gbRK_All.Location = New Point(353, 113)
        gbRK_All.Name = "gbRK_All"
        gbRK_All.Size = New Size(716, 303)
        gbRK_All.TabIndex = 8
        gbRK_All.TabStop = False
        gbRK_All.Text = "Remote BT Keyboard"
        ' 
        ' Label27
        ' 
        Label27.AutoSize = True
        Label27.Location = New Point(35, 252)
        Label27.Name = "Label27"
        Label27.Size = New Size(230, 15)
        Label27.TabIndex = 8
        Label27.Text = "To setup keyboard: http://sayodevice.com"
        ' 
        ' gbRK_BottomRight
        ' 
        gbRK_BottomRight.Controls.Add(Label21)
        gbRK_BottomRight.Controls.Add(Label22)
        gbRK_BottomRight.Controls.Add(CBRK_BottomRight)
        gbRK_BottomRight.Controls.Add(TBRK_BottomRight)
        gbRK_BottomRight.Location = New Point(465, 148)
        gbRK_BottomRight.Name = "gbRK_BottomRight"
        gbRK_BottomRight.Size = New Size(210, 94)
        gbRK_BottomRight.TabIndex = 7
        gbRK_BottomRight.TabStop = False
        gbRK_BottomRight.Text = "Top Left"
        ' 
        ' Label21
        ' 
        Label21.AutoSize = True
        Label21.Location = New Point(6, 55)
        Label21.Name = "Label21"
        Label21.Size = New Size(42, 15)
        Label21.TabIndex = 3
        Label21.Text = "Action"
        ' 
        ' Label22
        ' 
        Label22.AutoSize = True
        Label22.Location = New Point(6, 29)
        Label22.Name = "Label22"
        Label22.Size = New Size(66, 15)
        Label22.TabIndex = 2
        Label22.Text = "Bind to key"
        ' 
        ' CBRK_BottomRight
        ' 
        CBRK_BottomRight.FormattingEnabled = True
        CBRK_BottomRight.Items.AddRange(New Object() {"START", "NEXTACT", "NEXTSCENE", "NEXTEVENT", "SCRIPT_PGUP", "SCRIPT_PGDOWN"})
        CBRK_BottomRight.Location = New Point(81, 55)
        CBRK_BottomRight.Name = "CBRK_BottomRight"
        CBRK_BottomRight.Size = New Size(121, 23)
        CBRK_BottomRight.TabIndex = 1
        ' 
        ' TBRK_BottomRight
        ' 
        TBRK_BottomRight.Location = New Point(81, 26)
        TBRK_BottomRight.Name = "TBRK_BottomRight"
        TBRK_BottomRight.Size = New Size(121, 23)
        TBRK_BottomRight.TabIndex = 0
        ' 
        ' gbRK_TopRight
        ' 
        gbRK_TopRight.Controls.Add(Label19)
        gbRK_TopRight.Controls.Add(Label20)
        gbRK_TopRight.Controls.Add(CBRK_TopRight)
        gbRK_TopRight.Controls.Add(TBRK_TopRight)
        gbRK_TopRight.Location = New Point(465, 48)
        gbRK_TopRight.Name = "gbRK_TopRight"
        gbRK_TopRight.Size = New Size(210, 94)
        gbRK_TopRight.TabIndex = 4
        gbRK_TopRight.TabStop = False
        gbRK_TopRight.Text = "Top Left"
        ' 
        ' Label19
        ' 
        Label19.AutoSize = True
        Label19.Location = New Point(6, 55)
        Label19.Name = "Label19"
        Label19.Size = New Size(42, 15)
        Label19.TabIndex = 3
        Label19.Text = "Action"
        ' 
        ' Label20
        ' 
        Label20.AutoSize = True
        Label20.Location = New Point(6, 29)
        Label20.Name = "Label20"
        Label20.Size = New Size(66, 15)
        Label20.TabIndex = 2
        Label20.Text = "Bind to key"
        ' 
        ' CBRK_TopRight
        ' 
        CBRK_TopRight.FormattingEnabled = True
        CBRK_TopRight.Items.AddRange(New Object() {"START", "NEXTACT", "NEXTSCENE", "NEXTEVENT", "SCRIPT_PGUP", "SCRIPT_PGDOWN"})
        CBRK_TopRight.Location = New Point(81, 55)
        CBRK_TopRight.Name = "CBRK_TopRight"
        CBRK_TopRight.Size = New Size(121, 23)
        CBRK_TopRight.TabIndex = 1
        ' 
        ' TBRK_TopRight
        ' 
        TBRK_TopRight.Location = New Point(81, 26)
        TBRK_TopRight.Name = "TBRK_TopRight"
        TBRK_TopRight.Size = New Size(121, 23)
        TBRK_TopRight.TabIndex = 0
        ' 
        ' gbRK_BottomCenter
        ' 
        gbRK_BottomCenter.Controls.Add(Label23)
        gbRK_BottomCenter.Controls.Add(Label24)
        gbRK_BottomCenter.Controls.Add(CBRK_BottomCenter)
        gbRK_BottomCenter.Controls.Add(TBRK_BottomCenter)
        gbRK_BottomCenter.Location = New Point(249, 148)
        gbRK_BottomCenter.Name = "gbRK_BottomCenter"
        gbRK_BottomCenter.Size = New Size(210, 94)
        gbRK_BottomCenter.TabIndex = 6
        gbRK_BottomCenter.TabStop = False
        gbRK_BottomCenter.Text = "Top Left"
        ' 
        ' Label23
        ' 
        Label23.AutoSize = True
        Label23.Location = New Point(6, 55)
        Label23.Name = "Label23"
        Label23.Size = New Size(42, 15)
        Label23.TabIndex = 3
        Label23.Text = "Action"
        ' 
        ' Label24
        ' 
        Label24.AutoSize = True
        Label24.Location = New Point(6, 29)
        Label24.Name = "Label24"
        Label24.Size = New Size(66, 15)
        Label24.TabIndex = 2
        Label24.Text = "Bind to key"
        ' 
        ' CBRK_BottomCenter
        ' 
        CBRK_BottomCenter.FormattingEnabled = True
        CBRK_BottomCenter.Items.AddRange(New Object() {"START", "NEXTACT", "NEXTSCENE", "NEXTEVENT", "SCRIPT_PGUP", "SCRIPT_PGDOWN"})
        CBRK_BottomCenter.Location = New Point(81, 55)
        CBRK_BottomCenter.Name = "CBRK_BottomCenter"
        CBRK_BottomCenter.Size = New Size(121, 23)
        CBRK_BottomCenter.TabIndex = 1
        ' 
        ' TBRK_BottomCenter
        ' 
        TBRK_BottomCenter.Location = New Point(81, 26)
        TBRK_BottomCenter.Name = "TBRK_BottomCenter"
        TBRK_BottomCenter.Size = New Size(121, 23)
        TBRK_BottomCenter.TabIndex = 0
        ' 
        ' gbRK_BottomLeft
        ' 
        gbRK_BottomLeft.Controls.Add(Label25)
        gbRK_BottomLeft.Controls.Add(Label26)
        gbRK_BottomLeft.Controls.Add(CBRK_BottomLeft)
        gbRK_BottomLeft.Controls.Add(TBRK_BottomLeft)
        gbRK_BottomLeft.Location = New Point(33, 148)
        gbRK_BottomLeft.Name = "gbRK_BottomLeft"
        gbRK_BottomLeft.Size = New Size(210, 94)
        gbRK_BottomLeft.TabIndex = 5
        gbRK_BottomLeft.TabStop = False
        gbRK_BottomLeft.Text = "Top Left"
        ' 
        ' Label25
        ' 
        Label25.AutoSize = True
        Label25.Location = New Point(6, 55)
        Label25.Name = "Label25"
        Label25.Size = New Size(42, 15)
        Label25.TabIndex = 3
        Label25.Text = "Action"
        ' 
        ' Label26
        ' 
        Label26.AutoSize = True
        Label26.Location = New Point(6, 29)
        Label26.Name = "Label26"
        Label26.Size = New Size(66, 15)
        Label26.TabIndex = 2
        Label26.Text = "Bind to key"
        ' 
        ' CBRK_BottomLeft
        ' 
        CBRK_BottomLeft.FormattingEnabled = True
        CBRK_BottomLeft.Items.AddRange(New Object() {"START", "NEXTACT", "NEXTSCENE", "NEXTEVENT", "SCRIPT_PGUP", "SCRIPT_PGDOWN"})
        CBRK_BottomLeft.Location = New Point(81, 55)
        CBRK_BottomLeft.Name = "CBRK_BottomLeft"
        CBRK_BottomLeft.Size = New Size(121, 23)
        CBRK_BottomLeft.TabIndex = 1
        ' 
        ' TBRK_BottomLeft
        ' 
        TBRK_BottomLeft.Location = New Point(81, 26)
        TBRK_BottomLeft.Name = "TBRK_BottomLeft"
        TBRK_BottomLeft.Size = New Size(121, 23)
        TBRK_BottomLeft.TabIndex = 0
        ' 
        ' gbRK_TopCenter
        ' 
        gbRK_TopCenter.Controls.Add(Label17)
        gbRK_TopCenter.Controls.Add(Label18)
        gbRK_TopCenter.Controls.Add(CBRK_TopCenter)
        gbRK_TopCenter.Controls.Add(TBRK_TopCenter)
        gbRK_TopCenter.Location = New Point(249, 48)
        gbRK_TopCenter.Name = "gbRK_TopCenter"
        gbRK_TopCenter.Size = New Size(210, 94)
        gbRK_TopCenter.TabIndex = 4
        gbRK_TopCenter.TabStop = False
        gbRK_TopCenter.Text = "Top Left"
        ' 
        ' Label17
        ' 
        Label17.AutoSize = True
        Label17.Location = New Point(6, 55)
        Label17.Name = "Label17"
        Label17.Size = New Size(42, 15)
        Label17.TabIndex = 3
        Label17.Text = "Action"
        ' 
        ' Label18
        ' 
        Label18.AutoSize = True
        Label18.Location = New Point(6, 29)
        Label18.Name = "Label18"
        Label18.Size = New Size(66, 15)
        Label18.TabIndex = 2
        Label18.Text = "Bind to key"
        ' 
        ' CBRK_TopCenter
        ' 
        CBRK_TopCenter.FormattingEnabled = True
        CBRK_TopCenter.Items.AddRange(New Object() {"START", "NEXTACT", "NEXTSCENE", "NEXTEVENT", "SCRIPT_PGUP", "SCRIPT_PGDOWN"})
        CBRK_TopCenter.Location = New Point(81, 55)
        CBRK_TopCenter.Name = "CBRK_TopCenter"
        CBRK_TopCenter.Size = New Size(121, 23)
        CBRK_TopCenter.TabIndex = 1
        ' 
        ' TBRK_TopCenter
        ' 
        TBRK_TopCenter.Location = New Point(81, 26)
        TBRK_TopCenter.Name = "TBRK_TopCenter"
        TBRK_TopCenter.Size = New Size(121, 23)
        TBRK_TopCenter.TabIndex = 0
        ' 
        ' gbRK_TopLeft
        ' 
        gbRK_TopLeft.Controls.Add(Label16)
        gbRK_TopLeft.Controls.Add(Label15)
        gbRK_TopLeft.Controls.Add(CBRK_TopLeft)
        gbRK_TopLeft.Controls.Add(TBRK_TopLeft)
        gbRK_TopLeft.Location = New Point(33, 48)
        gbRK_TopLeft.Name = "gbRK_TopLeft"
        gbRK_TopLeft.Size = New Size(210, 94)
        gbRK_TopLeft.TabIndex = 0
        gbRK_TopLeft.TabStop = False
        gbRK_TopLeft.Text = "Top Left"
        ' 
        ' Label16
        ' 
        Label16.AutoSize = True
        Label16.Location = New Point(6, 55)
        Label16.Name = "Label16"
        Label16.Size = New Size(42, 15)
        Label16.TabIndex = 3
        Label16.Text = "Action"
        ' 
        ' Label15
        ' 
        Label15.AutoSize = True
        Label15.Location = New Point(6, 29)
        Label15.Name = "Label15"
        Label15.Size = New Size(66, 15)
        Label15.TabIndex = 2
        Label15.Text = "Bind to key"
        ' 
        ' CBRK_TopLeft
        ' 
        CBRK_TopLeft.FormattingEnabled = True
        CBRK_TopLeft.Items.AddRange(New Object() {"START", "NEXTACT", "NEXTSCENE", "NEXTEVENT", "SCRIPT_PGUP", "SCRIPT_PGDOWN"})
        CBRK_TopLeft.Location = New Point(81, 55)
        CBRK_TopLeft.Name = "CBRK_TopLeft"
        CBRK_TopLeft.Size = New Size(121, 23)
        CBRK_TopLeft.TabIndex = 1
        ' 
        ' TBRK_TopLeft
        ' 
        TBRK_TopLeft.Location = New Point(81, 26)
        TBRK_TopLeft.Name = "TBRK_TopLeft"
        TBRK_TopLeft.Size = New Size(121, 23)
        TBRK_TopLeft.TabIndex = 0
        ' 
        ' GroupBox8
        ' 
        GroupBox8.Controls.Add(btn_ScriptPDF)
        GroupBox8.Controls.Add(settings_ScriptPDF)
        GroupBox8.Controls.Add(Label4)
        GroupBox8.Controls.Add(Label14)
        GroupBox8.Controls.Add(settings_DDPPort)
        GroupBox8.Controls.Add(settings_EffectsPath)
        GroupBox8.Controls.Add(Label11)
        GroupBox8.Controls.Add(settings_PalettesPath)
        GroupBox8.Controls.Add(Label10)
        GroupBox8.Controls.Add(settings_ProjectName)
        GroupBox8.Controls.Add(Label6)
        GroupBox8.Controls.Add(btnProjectFolder)
        GroupBox8.Controls.Add(settings_ProjectFolder)
        GroupBox8.Controls.Add(Label5)
        GroupBox8.ForeColor = Color.MidnightBlue
        GroupBox8.Location = New Point(8, 206)
        GroupBox8.Name = "GroupBox8"
        GroupBox8.Size = New Size(338, 210)
        GroupBox8.TabIndex = 7
        GroupBox8.TabStop = False
        GroupBox8.Text = "Project settings"
        ' 
        ' btn_ScriptPDF
        ' 
        btn_ScriptPDF.Location = New Point(310, 179)
        btn_ScriptPDF.Name = "btn_ScriptPDF"
        btn_ScriptPDF.Size = New Size(24, 23)
        btn_ScriptPDF.TabIndex = 8
        btn_ScriptPDF.Text = ".."
        btn_ScriptPDF.UseVisualStyleBackColor = True
        ' 
        ' settings_ScriptPDF
        ' 
        settings_ScriptPDF.Location = New Point(132, 179)
        settings_ScriptPDF.Name = "settings_ScriptPDF"
        settings_ScriptPDF.Size = New Size(178, 23)
        settings_ScriptPDF.TabIndex = 13
        ' 
        ' Label4
        ' 
        Label4.AutoSize = True
        Label4.Location = New Point(6, 182)
        Label4.Name = "Label4"
        Label4.Size = New Size(61, 15)
        Label4.TabIndex = 12
        Label4.Text = "PDF Script"
        ' 
        ' Label14
        ' 
        Label14.AutoSize = True
        Label14.ForeColor = Color.Black
        Label14.Location = New Point(6, 156)
        Label14.Name = "Label14"
        Label14.Size = New Size(55, 15)
        Label14.TabIndex = 11
        Label14.Text = "DDP Port"
        ' 
        ' settings_DDPPort
        ' 
        settings_DDPPort.Location = New Point(132, 151)
        settings_DDPPort.Name = "settings_DDPPort"
        settings_DDPPort.Size = New Size(200, 23)
        settings_DDPPort.TabIndex = 9
        ' 
        ' settings_EffectsPath
        ' 
        settings_EffectsPath.Location = New Point(133, 123)
        settings_EffectsPath.Name = "settings_EffectsPath"
        settings_EffectsPath.Size = New Size(199, 23)
        settings_EffectsPath.TabIndex = 8
        ' 
        ' Label11
        ' 
        Label11.AutoSize = True
        Label11.ForeColor = Color.Black
        Label11.Location = New Point(6, 126)
        Label11.Name = "Label11"
        Label11.Size = New Size(72, 15)
        Label11.TabIndex = 7
        Label11.Text = "Effect's path"
        ' 
        ' settings_PalettesPath
        ' 
        settings_PalettesPath.Location = New Point(133, 94)
        settings_PalettesPath.Name = "settings_PalettesPath"
        settings_PalettesPath.Size = New Size(199, 23)
        settings_PalettesPath.TabIndex = 6
        ' 
        ' Label10
        ' 
        Label10.AutoSize = True
        Label10.ForeColor = Color.Black
        Label10.Location = New Point(6, 97)
        Label10.Name = "Label10"
        Label10.Size = New Size(78, 15)
        Label10.TabIndex = 5
        Label10.Text = "Palette's path"
        ' 
        ' settings_ProjectName
        ' 
        settings_ProjectName.Location = New Point(133, 45)
        settings_ProjectName.Name = "settings_ProjectName"
        settings_ProjectName.Size = New Size(199, 23)
        settings_ProjectName.TabIndex = 4
        ' 
        ' Label6
        ' 
        Label6.AutoSize = True
        Label6.ForeColor = Color.Black
        Label6.Location = New Point(6, 48)
        Label6.Name = "Label6"
        Label6.Size = New Size(77, 15)
        Label6.TabIndex = 3
        Label6.Text = "Projectname:"
        ' 
        ' btnProjectFolder
        ' 
        btnProjectFolder.Location = New Point(310, 16)
        btnProjectFolder.Name = "btnProjectFolder"
        btnProjectFolder.Size = New Size(22, 23)
        btnProjectFolder.TabIndex = 2
        btnProjectFolder.Text = ".."
        btnProjectFolder.UseVisualStyleBackColor = True
        ' 
        ' settings_ProjectFolder
        ' 
        settings_ProjectFolder.Location = New Point(133, 16)
        settings_ProjectFolder.Name = "settings_ProjectFolder"
        settings_ProjectFolder.Size = New Size(177, 23)
        settings_ProjectFolder.TabIndex = 1
        ' 
        ' Label5
        ' 
        Label5.AutoSize = True
        Label5.ForeColor = Color.Black
        Label5.Location = New Point(6, 20)
        Label5.Name = "Label5"
        Label5.Size = New Size(78, 15)
        Label5.TabIndex = 0
        Label5.Text = "Projectfolder:"
        ' 
        ' GroupBox4
        ' 
        GroupBox4.Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Right
        GroupBox4.Controls.Add(txt_APIResult)
        GroupBox4.ForeColor = Color.MidnightBlue
        GroupBox4.Location = New Point(352, 6)
        GroupBox4.Name = "GroupBox4"
        GroupBox4.Size = New Size(1114, 100)
        GroupBox4.TabIndex = 5
        GroupBox4.TabStop = False
        GroupBox4.Text = "Logging / Last status"
        ' 
        ' txt_APIResult
        ' 
        txt_APIResult.Dock = DockStyle.Fill
        txt_APIResult.Location = New Point(3, 19)
        txt_APIResult.Multiline = True
        txt_APIResult.Name = "txt_APIResult"
        txt_APIResult.Size = New Size(1108, 78)
        txt_APIResult.TabIndex = 4
        ' 
        ' GroupBox2
        ' 
        GroupBox2.Controls.Add(pbSecondaryStatus)
        GroupBox2.Controls.Add(Label1)
        GroupBox2.Controls.Add(pbPrimaryStatus)
        GroupBox2.Controls.Add(cbMonitorSecond)
        GroupBox2.Controls.Add(pbControlStatus)
        GroupBox2.Controls.Add(cbMonitorPrime)
        GroupBox2.Controls.Add(cbMonitorControl)
        GroupBox2.Controls.Add(Label3)
        GroupBox2.Controls.Add(Label2)
        GroupBox2.Controls.Add(lblShowMonitor)
        GroupBox2.ForeColor = Color.MidnightBlue
        GroupBox2.Location = New Point(8, 65)
        GroupBox2.Name = "GroupBox2"
        GroupBox2.Size = New Size(338, 135)
        GroupBox2.TabIndex = 2
        GroupBox2.TabStop = False
        GroupBox2.Text = "Monitors"
        ' 
        ' pbSecondaryStatus
        ' 
        pbSecondaryStatus.Image = My.Resources.Resources.iconRedBullet1
        pbSecondaryStatus.Location = New Point(310, 103)
        pbSecondaryStatus.Name = "pbSecondaryStatus"
        pbSecondaryStatus.Size = New Size(22, 22)
        pbSecondaryStatus.TabIndex = 5
        pbSecondaryStatus.TabStop = False
        ' 
        ' Label1
        ' 
        Label1.AutoSize = True
        Label1.ForeColor = Color.Black
        Label1.Location = New Point(133, 41)
        Label1.Name = "Label1"
        Label1.Size = New Size(189, 15)
        Label1.TabIndex = 6
        Label1.Text = "You need to restart after changing."
        ' 
        ' pbPrimaryStatus
        ' 
        pbPrimaryStatus.Image = My.Resources.Resources.iconRedBullet1
        pbPrimaryStatus.Location = New Point(310, 75)
        pbPrimaryStatus.Name = "pbPrimaryStatus"
        pbPrimaryStatus.Size = New Size(22, 22)
        pbPrimaryStatus.TabIndex = 4
        pbPrimaryStatus.TabStop = False
        ' 
        ' cbMonitorSecond
        ' 
        cbMonitorSecond.FormattingEnabled = True
        cbMonitorSecond.Items.AddRange(New Object() {"Output 1", "Output 2", "Output 3", "Disabled"})
        cbMonitorSecond.Location = New Point(133, 102)
        cbMonitorSecond.Name = "cbMonitorSecond"
        cbMonitorSecond.Size = New Size(177, 23)
        cbMonitorSecond.TabIndex = 5
        ' 
        ' pbControlStatus
        ' 
        pbControlStatus.Image = My.Resources.Resources.iconRedBullet1
        pbControlStatus.Location = New Point(310, 16)
        pbControlStatus.Name = "pbControlStatus"
        pbControlStatus.Size = New Size(22, 22)
        pbControlStatus.TabIndex = 3
        pbControlStatus.TabStop = False
        ' 
        ' cbMonitorPrime
        ' 
        cbMonitorPrime.FormattingEnabled = True
        cbMonitorPrime.Items.AddRange(New Object() {"Output 1", "Output 2", "Output 3", "Disabled"})
        cbMonitorPrime.Location = New Point(133, 74)
        cbMonitorPrime.Name = "cbMonitorPrime"
        cbMonitorPrime.Size = New Size(177, 23)
        cbMonitorPrime.TabIndex = 4
        ' 
        ' cbMonitorControl
        ' 
        cbMonitorControl.FormattingEnabled = True
        cbMonitorControl.Items.AddRange(New Object() {"Output 1", "Output 2", "Output 3"})
        cbMonitorControl.Location = New Point(133, 15)
        cbMonitorControl.Name = "cbMonitorControl"
        cbMonitorControl.Size = New Size(177, 23)
        cbMonitorControl.TabIndex = 3
        ' 
        ' Label3
        ' 
        Label3.AutoSize = True
        Label3.ForeColor = Color.Black
        Label3.Location = New Point(6, 105)
        Label3.Name = "Label3"
        Label3.Size = New Size(108, 15)
        Label3.TabIndex = 2
        Label3.Text = "Secondairy beamer"
        ' 
        ' Label2
        ' 
        Label2.AutoSize = True
        Label2.ForeColor = Color.Black
        Label2.Location = New Point(6, 77)
        Label2.Name = "Label2"
        Label2.Size = New Size(91, 15)
        Label2.TabIndex = 1
        Label2.Text = "Primary beamer"
        ' 
        ' lblShowMonitor
        ' 
        lblShowMonitor.AutoSize = True
        lblShowMonitor.ForeColor = Color.Black
        lblShowMonitor.Location = New Point(6, 18)
        lblShowMonitor.Name = "lblShowMonitor"
        lblShowMonitor.Size = New Size(107, 15)
        lblShowMonitor.TabIndex = 0
        lblShowMonitor.Text = "Show controller on"
        ' 
        ' GroupBox1
        ' 
        GroupBox1.Controls.Add(txtIPRange)
        GroupBox1.Controls.Add(lblIPRange)
        GroupBox1.ForeColor = Color.MidnightBlue
        GroupBox1.Location = New Point(8, 6)
        GroupBox1.Name = "GroupBox1"
        GroupBox1.Size = New Size(338, 53)
        GroupBox1.TabIndex = 1
        GroupBox1.TabStop = False
        GroupBox1.Text = "Network"
        ' 
        ' txtIPRange
        ' 
        txtIPRange.Location = New Point(133, 16)
        txtIPRange.Name = "txtIPRange"
        txtIPRange.ReadOnly = True
        txtIPRange.Size = New Size(199, 23)
        txtIPRange.TabIndex = 1
        ' 
        ' lblIPRange
        ' 
        lblIPRange.AutoSize = True
        lblIPRange.ForeColor = Color.Black
        lblIPRange.Location = New Point(6, 19)
        lblIPRange.Name = "lblIPRange"
        lblIPRange.Size = New Size(55, 15)
        lblIPRange.TabIndex = 0
        lblIPRange.Text = "IP-Range"
        ' 
        ' ToolStrip_Form
        ' 
        ToolStrip_Form.BackColor = Color.LightGray
        ToolStrip_Form.Dock = DockStyle.Bottom
        ToolStrip_Form.GripStyle = ToolStripGripStyle.Hidden
        ToolStrip_Form.Items.AddRange(New ToolStripItem() {btnSaveShow, ToolStripLabel1, btnLoadAll})
        ToolStrip_Form.Location = New Point(0, 957)
        ToolStrip_Form.Name = "ToolStrip_Form"
        ToolStrip_Form.Size = New Size(1844, 25)
        ToolStrip_Form.TabIndex = 5
        ToolStrip_Form.Text = "ToolStrip_General"
        ' 
        ' btnSaveShow
        ' 
        btnSaveShow.Alignment = ToolStripItemAlignment.Right
        btnSaveShow.DisplayStyle = ToolStripItemDisplayStyle.Text
        btnSaveShow.Image = CType(resources.GetObject("btnSaveShow.Image"), Image)
        btnSaveShow.ImageTransparentColor = Color.Magenta
        btnSaveShow.Name = "btnSaveShow"
        btnSaveShow.Size = New Size(35, 22)
        btnSaveShow.Text = "Save"
        btnSaveShow.ToolTipText = "Save"
        ' 
        ' ToolStripLabel1
        ' 
        ToolStripLabel1.Name = "ToolStripLabel1"
        ToolStripLabel1.Size = New Size(0, 22)
        ' 
        ' btnLoadAll
        ' 
        btnLoadAll.DisplayStyle = ToolStripItemDisplayStyle.Text
        btnLoadAll.Image = CType(resources.GetObject("btnLoadAll.Image"), Image)
        btnLoadAll.ImageTransparentColor = Color.Magenta
        btnLoadAll.Name = "btnLoadAll"
        btnLoadAll.Size = New Size(37, 22)
        btnLoadAll.Text = "Load"
        ' 
        ' TimerEverySecond
        ' 
        TimerEverySecond.Enabled = True
        TimerEverySecond.Interval = 1000
        ' 
        ' PictureBox1
        ' 
        PictureBox1.Anchor = AnchorStyles.Top Or AnchorStyles.Right
        PictureBox1.BackgroundImageLayout = ImageLayout.Center
        PictureBox1.Image = My.Resources.Resources.logo_kklt_inverted1
        PictureBox1.Location = New Point(1693, 2)
        PictureBox1.Name = "PictureBox1"
        PictureBox1.Size = New Size(151, 94)
        PictureBox1.SizeMode = PictureBoxSizeMode.Zoom
        PictureBox1.TabIndex = 6
        PictureBox1.TabStop = False
        ' 
        ' OpenFileDialog1
        ' 
        OpenFileDialog1.AddExtension = False
        OpenFileDialog1.AddToRecent = False
        OpenFileDialog1.CheckFileExists = False
        OpenFileDialog1.CheckPathExists = False
        OpenFileDialog1.FileName = "OpenFileDialog1"
        OpenFileDialog1.Title = "Projectfolder"
        ' 
        ' lblTitleProject
        ' 
        lblTitleProject.AutoSize = True
        lblTitleProject.Font = New Font("Segoe UI", 14.25F, FontStyle.Bold, GraphicsUnit.Point, CByte(0))
        lblTitleProject.ForeColor = Color.Gold
        lblTitleProject.Location = New Point(10, 8)
        lblTitleProject.Name = "lblTitleProject"
        lblTitleProject.Size = New Size(27, 25)
        lblTitleProject.TabIndex = 7
        lblTitleProject.Text = "..."
        ' 
        ' lblCurrentTime
        ' 
        lblCurrentTime.Anchor = AnchorStyles.Top Or AnchorStyles.Right
        lblCurrentTime.AutoSize = True
        lblCurrentTime.Font = New Font("Segoe UI", 36F, FontStyle.Regular, GraphicsUnit.Point, CByte(0))
        lblCurrentTime.ForeColor = Color.White
        lblCurrentTime.Location = New Point(1483, 8)
        lblCurrentTime.Name = "lblCurrentTime"
        lblCurrentTime.Size = New Size(204, 65)
        lblCurrentTime.TabIndex = 8
        lblCurrentTime.Text = "00:00:00"
        ' 
        ' TimerNextEvent
        ' 
        ' 
        ' TimerPingDevices
        ' 
        TimerPingDevices.Enabled = True
        TimerPingDevices.Interval = 60000
        ' 
        ' FrmMain
        ' 
        AutoScaleDimensions = New SizeF(7F, 15F)
        AutoScaleMode = AutoScaleMode.Font
        BackColor = Color.Black
        ClientSize = New Size(1844, 982)
        Controls.Add(lblCurrentTime)
        Controls.Add(lblTitleProject)
        Controls.Add(ToolStrip_Form)
        Controls.Add(TabControl)
        Controls.Add(PictureBox1)
        FormBorderStyle = FormBorderStyle.Fixed3D
        Icon = CType(resources.GetObject("$this.Icon"), Icon)
        MaximizeBox = False
        Name = "FrmMain"
        SizeGripStyle = SizeGripStyle.Hide
        Text = "KKLT Show viewer"
        CType(DG_Effecten, ComponentModel.ISupportInitialize).EndInit()
        TabControl.ResumeLayout(False)
        TabShow.ResumeLayout(False)
        TabShow.PerformLayout()
        gbPrimaryBeamer.ResumeLayout(False)
        gbPrimaryBeamer.PerformLayout()
        CType(WMP_PrimaryPlayer_Preview, ComponentModel.ISupportInitialize).EndInit()
        gb_MediaControl.ResumeLayout(False)
        SplitContainer2.Panel1.ResumeLayout(False)
        SplitContainer2.Panel2.ResumeLayout(False)
        CType(SplitContainer2, ComponentModel.ISupportInitialize).EndInit()
        SplitContainer2.ResumeLayout(False)
        TabControlShow.ResumeLayout(False)
        TabShowSummary.ResumeLayout(False)
        GroupBox6.ResumeLayout(False)
        GroupBox6.PerformLayout()
        CType(dg_NextLights, ComponentModel.ISupportInitialize).EndInit()
        CType(dg_NextActions, ComponentModel.ISupportInitialize).EndInit()
        CType(DataGridView3, ComponentModel.ISupportInitialize).EndInit()
        GroupBox5.ResumeLayout(False)
        GroupBox5.PerformLayout()
        GroupBox3.ResumeLayout(False)
        GroupBox3.PerformLayout()
        CType(dg_CurrentLights, ComponentModel.ISupportInitialize).EndInit()
        CType(dg_CurrentActions, ComponentModel.ISupportInitialize).EndInit()
        CType(dg_CurrentMedia, ComponentModel.ISupportInitialize).EndInit()
        TabShowList.ResumeLayout(False)
        CType(DG_Show, ComponentModel.ISupportInitialize).EndInit()
        CType(pbPDFViewer, ComponentModel.ISupportInitialize).EndInit()
        gb_Controls.ResumeLayout(False)
        gbSecondairyBeamer.ResumeLayout(False)
        gbSecondairyBeamer.PerformLayout()
        CType(WMP_SecondairyPlayer_Preview, ComponentModel.ISupportInitialize).EndInit()
        ToolStip_Show.ResumeLayout(False)
        ToolStip_Show.PerformLayout()
        TabTables.ResumeLayout(False)
        TabControlTables.ResumeLayout(False)
        TabStageActions.ResumeLayout(False)
        TabStageActions.PerformLayout()
        ToolStripTables.ResumeLayout(False)
        ToolStripTables.PerformLayout()
        SplitContainer3.Panel1.ResumeLayout(False)
        SplitContainer3.Panel2.ResumeLayout(False)
        CType(SplitContainer3, ComponentModel.ISupportInitialize).EndInit()
        SplitContainer3.ResumeLayout(False)
        CType(DG_Actions, ComponentModel.ISupportInitialize).EndInit()
        CType(DG_ActionsDetail, ComponentModel.ISupportInitialize).EndInit()
        TabLedDevices.ResumeLayout(False)
        SplitContainer1.Panel1.ResumeLayout(False)
        SplitContainer1.Panel1.PerformLayout()
        SplitContainer1.Panel2.ResumeLayout(False)
        SplitContainer1.Panel2.PerformLayout()
        CType(SplitContainer1, ComponentModel.ISupportInitialize).EndInit()
        SplitContainer1.ResumeLayout(False)
        CType(DG_Devices, ComponentModel.ISupportInitialize).EndInit()
        ToolStrip_Devices.ResumeLayout(False)
        ToolStrip_Devices.PerformLayout()
        CType(DG_Groups, ComponentModel.ISupportInitialize).EndInit()
        ToolStripGroups.ResumeLayout(False)
        ToolStripGroups.PerformLayout()
        TabEffects.ResumeLayout(False)
        TabEffects.PerformLayout()
        ToolStrip_Effecten.ResumeLayout(False)
        ToolStrip_Effecten.PerformLayout()
        TabPaletten.ResumeLayout(False)
        TabPaletten.PerformLayout()
        ToolStrip_Paletten.ResumeLayout(False)
        ToolStrip_Paletten.PerformLayout()
        CType(DG_Paletten, ComponentModel.ISupportInitialize).EndInit()
        TabSettings.ResumeLayout(False)
        gbRK_All.ResumeLayout(False)
        gbRK_All.PerformLayout()
        gbRK_BottomRight.ResumeLayout(False)
        gbRK_BottomRight.PerformLayout()
        gbRK_TopRight.ResumeLayout(False)
        gbRK_TopRight.PerformLayout()
        gbRK_BottomCenter.ResumeLayout(False)
        gbRK_BottomCenter.PerformLayout()
        gbRK_BottomLeft.ResumeLayout(False)
        gbRK_BottomLeft.PerformLayout()
        gbRK_TopCenter.ResumeLayout(False)
        gbRK_TopCenter.PerformLayout()
        gbRK_TopLeft.ResumeLayout(False)
        gbRK_TopLeft.PerformLayout()
        GroupBox8.ResumeLayout(False)
        GroupBox8.PerformLayout()
        GroupBox4.ResumeLayout(False)
        GroupBox4.PerformLayout()
        GroupBox2.ResumeLayout(False)
        GroupBox2.PerformLayout()
        CType(pbSecondaryStatus, ComponentModel.ISupportInitialize).EndInit()
        CType(pbPrimaryStatus, ComponentModel.ISupportInitialize).EndInit()
        CType(pbControlStatus, ComponentModel.ISupportInitialize).EndInit()
        GroupBox1.ResumeLayout(False)
        GroupBox1.PerformLayout()
        ToolStrip_Form.ResumeLayout(False)
        ToolStrip_Form.PerformLayout()
        CType(PictureBox1, ComponentModel.ISupportInitialize).EndInit()
        ResumeLayout(False)
        PerformLayout()
    End Sub
    Friend WithEvents DG_Effecten As DataGridView
    Friend WithEvents TabControl As TabControl
    Friend WithEvents TabEffects As TabPage
    Friend WithEvents txt_APIResult As TextBox
    Friend WithEvents TabShow As TabPage
    Friend WithEvents DG_Show As DataGridView
    Friend WithEvents ToolStrip_Form As ToolStrip
    Friend WithEvents btnSaveShow As ToolStripButton
    Friend WithEvents TabPaletten As TabPage
    Friend WithEvents DG_Paletten As DataGridView
    Friend WithEvents ToolStip_Show As ToolStrip
    Friend WithEvents btn_DGGrid_AddNewRowBefore As ToolStripButton
    Friend WithEvents btn_DGGrid_AddNewRowAfter As ToolStripButton
    Friend WithEvents btn_DGGrid_RemoveCurrentRow As ToolStripButton
    Friend WithEvents lblFilter As ToolStripLabel
    Friend WithEvents filterAct As ToolStripComboBox
    Friend WithEvents ToolStripSeparator2 As ToolStripSeparator
    Friend WithEvents TabSettings As TabPage
    Friend WithEvents GroupBox2 As GroupBox
    Friend WithEvents GroupBox1 As GroupBox
    Friend WithEvents lblIPRange As Label
    Friend WithEvents txtIPRange As TextBox
    Friend WithEvents cbMonitorSecond As ComboBox
    Friend WithEvents cbMonitorPrime As ComboBox
    Friend WithEvents cbMonitorControl As ComboBox
    Friend WithEvents Label3 As Label
    Friend WithEvents Label2 As Label
    Friend WithEvents lblShowMonitor As Label
    Friend WithEvents Label1 As Label
    Friend WithEvents gbPrimaryBeamer As GroupBox
    Friend WithEvents pbControlStatus As PictureBox
    Friend WithEvents lblOutput3 As Label
    Friend WithEvents lblOutput2 As Label
    Friend WithEvents lblOutput1 As Label
    Friend WithEvents pbSecondaryStatus As PictureBox
    Friend WithEvents pbPrimaryStatus As PictureBox
    Friend WithEvents TimerEverySecond As Timer
    Friend WithEvents ToolStripLabel1 As ToolStripLabel
    Friend WithEvents BtnScanNetwork As ToolStripButton
    Friend WithEvents GroupBox4 As GroupBox
    Friend WithEvents PictureBox1 As PictureBox
    Friend WithEvents gbSecondairyBeamer As GroupBox
    Friend WithEvents WMP_SecondairyPlayer_Preview As AxWMPLib.AxWindowsMediaPlayer
    Friend WithEvents WMP_PrimaryPlayer_Preview As AxWMPLib.AxWindowsMediaPlayer
    Friend WithEvents GroupBox8 As GroupBox
    Friend WithEvents Label5 As Label
    Friend WithEvents OpenFileDialog1 As OpenFileDialog
    Friend WithEvents btnProjectFolder As Button
    Friend WithEvents settings_ProjectFolder As TextBox
    Friend WithEvents settings_ProjectName As TextBox
    Friend WithEvents Label6 As Label
    Friend WithEvents lblTitleProject As Label
    Friend WithEvents lblCurrentTime As Label
    Friend WithEvents btnLockUnlocked As ToolStripButton
    Friend WithEvents ToolStrip_Paletten As ToolStrip
    Friend WithEvents ToolStripButton1 As ToolStripButton
    Friend WithEvents RichTextBox2 As RichTextBox
    Friend WithEvents ToolStrip_Effecten As ToolStrip
    Friend WithEvents RichTextBox3 As RichTextBox
    Friend WithEvents gb_Controls As GroupBox
    Friend WithEvents btnControl_NextEvent As Button
    Friend WithEvents btnControl_Start As Button
    Friend WithEvents btnControl_NextScene As Button
    Friend WithEvents lblControl_TimeLeft As Label
    Friend WithEvents TimerNextEvent As Timer
    Friend WithEvents TimerPingDevices As Timer
    Friend WithEvents settings_EffectsPath As TextBox
    Friend WithEvents Label11 As Label
    Friend WithEvents settings_PalettesPath As TextBox
    Friend WithEvents Label10 As Label
    Friend WithEvents btnTestExistanceEffects As ToolStripButton
    Friend WithEvents RichTextBox4 As RichTextBox
    Friend WithEvents Label14 As Label
    Friend WithEvents settings_DDPPort As TextBox
    Friend WithEvents ListCustomEffects As ToolStripComboBox
    Friend WithEvents TabTables As TabPage
    Friend WithEvents TabControlTables As TabControl
    Friend WithEvents btnLoadAll As ToolStripButton
    Friend WithEvents colNrOfSegments As DataGridViewTextBoxColumn
    Friend WithEvents btnRebuildDGEffects As ToolStripButton
    Friend WithEvents btnRebuildDGPalettes As ToolStripButton
    Friend WithEvents colProcessed As DataGridViewComboBoxColumn
    Friend WithEvents btnControl_StopAll As Button
    Friend WithEvents warning_SecondairyBeamerOffline As Label
    Friend WithEvents warning_PrimaryBeamerOffline As Label
    Friend WithEvents btnControl_NextAct As Button
    Friend WithEvents coFrame_FixtureID As DataGridViewTextBoxColumn
    Friend WithEvents SplitContainer2 As SplitContainer
    Friend WithEvents btn_ScriptPDF As Button
    Friend WithEvents settings_ScriptPDF As TextBox
    Friend WithEvents Label4 As Label
    Friend WithEvents ToolStripLabel7 As ToolStripLabel
    Friend WithEvents lblPDFPage As ToolStripLabel
    Friend WithEvents pbPDFViewer As PictureBox
    Friend WithEvents ToolStripSeparator10 As ToolStripSeparator
    Friend WithEvents btnAutoGotoPDFPage As ToolStripButton
    Friend WithEvents ToolStripSeparator11 As ToolStripSeparator
    Friend WithEvents TabStageActions As TabPage
    Friend WithEvents SplitContainer3 As SplitContainer
    Friend WithEvents DG_Actions As DataGridView
    Friend WithEvents DG_ActionsDetail As DataGridView
    Friend WithEvents colActionRowID As DataGridViewTextBoxColumn
    Friend WithEvents colActionRowOrder As DataGridViewTextBoxColumn
    Friend WithEvents colActionRowDescr As DataGridViewTextBoxColumn
    Friend WithEvents colActionRowActor As DataGridViewTextBoxColumn
    Friend WithEvents colActionId As DataGridViewTextBoxColumn
    Friend WithEvents colActionPage As DataGridViewTextBoxColumn
    Friend WithEvents colActionPosX As DataGridViewTextBoxColumn
    Friend WithEvents colActionPosY As DataGridViewTextBoxColumn
    Friend WithEvents colActionImage As DataGridViewTextBoxColumn
    Friend WithEvents gbRK_All As GroupBox
    Friend WithEvents gbRK_TopLeft As GroupBox
    Friend WithEvents Label27 As Label
    Friend WithEvents gbRK_BottomRight As GroupBox
    Friend WithEvents Label21 As Label
    Friend WithEvents Label22 As Label
    Friend WithEvents CBRK_BottomRight As ComboBox
    Friend WithEvents TBRK_BottomRight As TextBox
    Friend WithEvents gbRK_TopRight As GroupBox
    Friend WithEvents Label19 As Label
    Friend WithEvents Label20 As Label
    Friend WithEvents CBRK_TopRight As ComboBox
    Friend WithEvents TBRK_TopRight As TextBox
    Friend WithEvents gbRK_BottomCenter As GroupBox
    Friend WithEvents Label23 As Label
    Friend WithEvents Label24 As Label
    Friend WithEvents CBRK_BottomCenter As ComboBox
    Friend WithEvents TBRK_BottomCenter As TextBox
    Friend WithEvents gbRK_BottomLeft As GroupBox
    Friend WithEvents Label25 As Label
    Friend WithEvents Label26 As Label
    Friend WithEvents CBRK_BottomLeft As ComboBox
    Friend WithEvents TBRK_BottomLeft As TextBox
    Friend WithEvents gbRK_TopCenter As GroupBox
    Friend WithEvents Label17 As Label
    Friend WithEvents Label18 As Label
    Friend WithEvents CBRK_TopCenter As ComboBox
    Friend WithEvents TBRK_TopCenter As TextBox
    Friend WithEvents Label16 As Label
    Friend WithEvents Label15 As Label
    Friend WithEvents CBRK_TopLeft As ComboBox
    Friend WithEvents TBRK_TopLeft As TextBox
    Friend WithEvents btnApply As DataGridViewButtonColumn
    Friend WithEvents colAct As DataGridViewComboBoxColumn
    Friend WithEvents colSceneId As DataGridViewTextBoxColumn
    Friend WithEvents colEventId As DataGridViewTextBoxColumn
    Friend WithEvents colTimer As DataGridViewTextBoxColumn
    Friend WithEvents colType As DataGridViewComboBoxColumn
    Friend WithEvents colCue As DataGridViewTextBoxColumn
    Friend WithEvents colFixture As DataGridViewComboBoxColumn
    Friend WithEvents colStateOnOff As DataGridViewComboBoxColumn
    Friend WithEvents colEffectId As DataGridViewTextBoxColumn
    Friend WithEvents colEffect As DataGridViewComboBoxColumn
    Friend WithEvents colPaletteId As DataGridViewTextBoxColumn
    Friend WithEvents colPalette As DataGridViewComboBoxColumn
    Friend WithEvents colColor1 As DataGridViewTextBoxColumn
    Friend WithEvents colColor2 As DataGridViewTextBoxColumn
    Friend WithEvents colColor3 As DataGridViewTextBoxColumn
    Friend WithEvents colBrightness As DataGridViewTextBoxColumn
    Friend WithEvents colSpeed As DataGridViewTextBoxColumn
    Friend WithEvents colIntensity As DataGridViewTextBoxColumn
    Friend WithEvents colTransition As DataGridViewTextBoxColumn
    Friend WithEvents colBlend As DataGridViewCheckBoxColumn
    Friend WithEvents colRepeat As DataGridViewCheckBoxColumn
    Friend WithEvents colSound As DataGridViewCheckBoxColumn
    Friend WithEvents colFilename As DataGridViewTextBoxColumn
    Friend WithEvents colSend As DataGridViewCheckBoxColumn
    Friend WithEvents ScriptPg As DataGridViewTextBoxColumn
    Friend WithEvents TabControlShow As TabControl
    Friend WithEvents TabShowSummary As TabPage
    Friend WithEvents GroupBox6 As GroupBox
    Friend WithEvents Label7 As Label
    Friend WithEvents Label13 As Label
    Friend WithEvents dg_NextLights As DataGridView
    Friend WithEvents Label28 As Label
    Friend WithEvents dg_NextActions As DataGridView
    Friend WithEvents Label29 As Label
    Friend WithEvents Label30 As Label
    Friend WithEvents DataGridView3 As DataGridView
    Friend WithEvents GroupBox5 As GroupBox
    Friend WithEvents lblCueToAdvance As Label
    Friend WithEvents GroupBox3 As GroupBox
    Friend WithEvents lblComments As Label
    Friend WithEvents lblCurrentTitle As Label
    Friend WithEvents dg_CurrentLights As DataGridView
    Friend WithEvents Label8 As Label
    Friend WithEvents dg_CurrentActions As DataGridView
    Friend WithEvents Label9 As Label
    Friend WithEvents Label12 As Label
    Friend WithEvents dg_CurrentMedia As DataGridView
    Friend WithEvents TabShowList As TabPage
    Friend WithEvents TabLedDevices As TabPage
    Friend WithEvents TabLedSegments As TabPage
    Friend WithEvents ToolStripTables As ToolStrip
    Friend WithEvents btnTablesAddRowBefore As ToolStripButton
    Friend WithEvents btnTablesAddRowAfter As ToolStripButton
    Friend WithEvents btnTablesDeleteSingleRow As ToolStripButton
    Friend WithEvents ToolStripSeparator3 As ToolStripSeparator
    Friend WithEvents btnDeleteAllTables As ToolStripButton
    Friend WithEvents ToolStripSeparator5 As ToolStripSeparator
    Friend WithEvents SplitContainer1 As SplitContainer
    Friend WithEvents DG_Devices As DataGridView
    Friend WithEvents colIPAddress As DataGridViewTextBoxColumn
    Friend WithEvents colInstance As DataGridViewTextBoxColumn
    Friend WithEvents colLayout As DataGridViewTextBoxColumn
    Friend WithEvents colLedCount As DataGridViewTextBoxColumn
    Friend WithEvents colSegments As DataGridViewTextBoxColumn
    Friend WithEvents colEffects As DataGridViewTextBoxColumn
    Friend WithEvents colPalettes As DataGridViewTextBoxColumn
    Friend WithEvents colEnabled As DataGridViewCheckBoxColumn
    Friend WithEvents colOnline As DataGridViewImageColumn
    Friend WithEvents colDDPData As DataGridViewTextBoxColumn
    Friend WithEvents colDDPOffset As DataGridViewTextBoxColumn
    Friend WithEvents colSegmentsData As DataGridViewTextBoxColumn
    Friend WithEvents colDataProvider As DataGridViewComboBoxColumn
    Friend WithEvents colBrand As DataGridViewComboBoxColumn
    Friend WithEvents ToolStrip_Devices As ToolStrip
    Friend WithEvents LblDeviceStatus As ToolStripLabel
    Friend WithEvents btnScanNetworkForWLed As ToolStripButton
    Friend WithEvents btnDevicesRefreshIPs As ToolStripButton
    Friend WithEvents ToolStripSeparator13 As ToolStripSeparator
    Friend WithEvents btnDownloadSegmentDataFromWLED As ToolStripButton
    Friend WithEvents btnSendUpdatedSegmentsToWLED As ToolStripButton
    Friend WithEvents btnDeleteDevice As ToolStripButton
    Friend WithEvents btnAddDevice As ToolStripButton
    Friend WithEvents ToolStripSeparator4 As ToolStripSeparator
    Friend WithEvents btnGenerateStage As ToolStripButton
    Friend WithEvents ToolStripSeparator12 As ToolStripSeparator
    Friend WithEvents ToolStripLabel8 As ToolStripLabel
    Friend WithEvents btnAutoPing As ToolStripButton
    Friend WithEvents DG_Groups As DataGridView
    Friend WithEvents colGroupId As DataGridViewTextBoxColumn
    Friend WithEvents colGroupParentId As DataGridViewTextBoxColumn
    Friend WithEvents colGroupName As DataGridViewTextBoxColumn
    Friend WithEvents colGroupFixture As DataGridViewComboBoxColumn
    Friend WithEvents colGroupSegment As DataGridViewTextBoxColumn
    Friend WithEvents colGroupStartLedNr As DataGridViewTextBoxColumn
    Friend WithEvents colGroupStopLedNr As DataGridViewTextBoxColumn
    Friend WithEvents colGroupOrder As DataGridViewTextBoxColumn
    Friend WithEvents colAllFrames As DataGridViewTextBoxColumn
    Friend WithEvents colActiveFrame As DataGridViewTextBoxColumn
    Friend WithEvents colGroupRepeat As DataGridViewCheckBoxColumn
    Friend WithEvents colGroupLayout As DataGridViewTextBoxColumn
    Friend WithEvents ToolStripGroups As ToolStrip
    Friend WithEvents btnGroupDeleteRow As ToolStripButton
    Friend WithEvents btnGroupAddRowBefore As ToolStripButton
    Friend WithEvents btnGroupAddRowAfter As ToolStripButton
    Friend WithEvents btnGroupsAutoSplit As ToolStripButton
    Friend WithEvents gb_StatusConnections As GroupBox
    Friend WithEvents gb_MediaControl As GroupBox
    Friend WithEvents btnStopLoopingAtEndOfVideo As Button
    Friend WithEvents btn_ReconnectSecondairyBeamer As Button
    Friend WithEvents btn_ReconnectPrimaryBeamer As Button

End Class

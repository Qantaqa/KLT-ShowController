<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class PopUp_DetailShowWLED
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
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
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        btnOK = New Button()
        btnCancel = New Button()
        GroupBox1 = New GroupBox()
        cbAct = New ComboBox()
        tbCue = New TextBox()
        Label4 = New Label()
        tbEvent = New TextBox()
        Label3 = New Label()
        tbScene = New TextBox()
        Label2 = New Label()
        Label1 = New Label()
        GroupBox2 = New GroupBox()
        Label13 = New Label()
        tbTimer = New TextBox()
        cbDevice = New ComboBox()
        Label7 = New Label()
        cbPalette = New ComboBox()
        Label6 = New Label()
        cbEffect = New ComboBox()
        Label5 = New Label()
        GroupBox3 = New GroupBox()
        txtTransition = New TextBox()
        txtSpeed = New TextBox()
        txtIntensity = New TextBox()
        txtBrightness = New TextBox()
        btnColor3 = New Button()
        btnColor2 = New Button()
        btnColor1 = New Button()
        cbBlend = New CheckBox()
        cbSound = New CheckBox()
        tbTransition = New TrackBar()
        Label12 = New Label()
        tbSpeed = New TrackBar()
        Label11 = New Label()
        tbIntensity = New TrackBar()
        Label10 = New Label()
        tbBrightness = New TrackBar()
        Label9 = New Label()
        cbPower = New CheckBox()
        cbAutoPreview = New CheckBox()
        btnCopy = New Button()
        btnPaste = New Button()
        pbPreviewPalette = New PictureBox()
        pbPreviewEffect = New PictureBox()
        btnPreview = New Button()
        GroupBox4 = New GroupBox()
        SplitContainer1 = New SplitContainer()
        btnRetrieveFromWLED = New Button()
        btnCopyToBank = New Button()
        btnCopyFromBank = New Button()
        gb_bank = New GroupBox()
        flpBankSlots = New FlowLayoutPanel()
        txtSelectedSlot = New TextBox()
        GroupBox1.SuspendLayout()
        GroupBox2.SuspendLayout()
        GroupBox3.SuspendLayout()
        CType(tbTransition, ComponentModel.ISupportInitialize).BeginInit()
        CType(tbSpeed, ComponentModel.ISupportInitialize).BeginInit()
        CType(tbIntensity, ComponentModel.ISupportInitialize).BeginInit()
        CType(tbBrightness, ComponentModel.ISupportInitialize).BeginInit()
        CType(pbPreviewPalette, ComponentModel.ISupportInitialize).BeginInit()
        CType(pbPreviewEffect, ComponentModel.ISupportInitialize).BeginInit()
        GroupBox4.SuspendLayout()
        CType(SplitContainer1, ComponentModel.ISupportInitialize).BeginInit()
        SplitContainer1.Panel1.SuspendLayout()
        SplitContainer1.Panel2.SuspendLayout()
        SplitContainer1.SuspendLayout()
        gb_bank.SuspendLayout()
        SuspendLayout()
        ' 
        ' btnOK
        ' 
        btnOK.ForeColor = Color.DarkGreen
        btnOK.Location = New Point(544, 583)
        btnOK.Name = "btnOK"
        btnOK.Size = New Size(222, 22)
        btnOK.TabIndex = 0
        btnOK.Text = "OK"
        btnOK.UseVisualStyleBackColor = True
        ' 
        ' btnCancel
        ' 
        btnCancel.ForeColor = Color.Red
        btnCancel.Location = New Point(12, 583)
        btnCancel.Name = "btnCancel"
        btnCancel.Size = New Size(108, 22)
        btnCancel.TabIndex = 1
        btnCancel.Text = "Cancel"
        btnCancel.UseVisualStyleBackColor = True
        ' 
        ' GroupBox1
        ' 
        GroupBox1.Controls.Add(cbAct)
        GroupBox1.Controls.Add(tbCue)
        GroupBox1.Controls.Add(Label4)
        GroupBox1.Controls.Add(tbEvent)
        GroupBox1.Controls.Add(Label3)
        GroupBox1.Controls.Add(tbScene)
        GroupBox1.Controls.Add(Label2)
        GroupBox1.Controls.Add(Label1)
        GroupBox1.ForeColor = SystemColors.ActiveCaption
        GroupBox1.Location = New Point(3, 3)
        GroupBox1.Name = "GroupBox1"
        GroupBox1.Size = New Size(462, 88)
        GroupBox1.TabIndex = 2
        GroupBox1.TabStop = False
        GroupBox1.Text = "Trigger"
        ' 
        ' cbAct
        ' 
        cbAct.FormattingEnabled = True
        cbAct.Items.AddRange(New Object() {"Pre-Show", "Act 1", "Pauze", "Act 2", "Act 3", "Post-Show"})
        cbAct.Location = New Point(102, 25)
        cbAct.Name = "cbAct"
        cbAct.Size = New Size(92, 23)
        cbAct.TabIndex = 8
        ' 
        ' tbCue
        ' 
        tbCue.Location = New Point(105, 52)
        tbCue.Name = "tbCue"
        tbCue.Size = New Size(318, 23)
        tbCue.TabIndex = 7
        ' 
        ' Label4
        ' 
        Label4.AutoSize = True
        Label4.Location = New Point(15, 55)
        Label4.Name = "Label4"
        Label4.Size = New Size(28, 15)
        Label4.TabIndex = 6
        Label4.Text = "Cue"
        ' 
        ' tbEvent
        ' 
        tbEvent.Location = New Point(361, 25)
        tbEvent.Name = "tbEvent"
        tbEvent.Size = New Size(62, 23)
        tbEvent.TabIndex = 5
        ' 
        ' Label3
        ' 
        Label3.AutoSize = True
        Label3.Location = New Point(312, 28)
        Label3.Name = "Label3"
        Label3.Size = New Size(36, 15)
        Label3.TabIndex = 4
        Label3.Text = "Event"
        ' 
        ' tbScene
        ' 
        tbScene.Location = New Point(244, 25)
        tbScene.Name = "tbScene"
        tbScene.Size = New Size(62, 23)
        tbScene.TabIndex = 3
        ' 
        ' Label2
        ' 
        Label2.AutoSize = True
        Label2.Location = New Point(200, 28)
        Label2.Name = "Label2"
        Label2.Size = New Size(38, 15)
        Label2.TabIndex = 2
        Label2.Text = "Scene"
        ' 
        ' Label1
        ' 
        Label1.AutoSize = True
        Label1.Location = New Point(18, 28)
        Label1.Name = "Label1"
        Label1.Size = New Size(25, 15)
        Label1.TabIndex = 0
        Label1.Text = "Act"
        ' 
        ' GroupBox2
        ' 
        GroupBox2.Controls.Add(Label13)
        GroupBox2.Controls.Add(tbTimer)
        GroupBox2.Controls.Add(cbDevice)
        GroupBox2.Controls.Add(Label7)
        GroupBox2.ForeColor = SystemColors.ActiveCaption
        GroupBox2.Location = New Point(3, 97)
        GroupBox2.Name = "GroupBox2"
        GroupBox2.Size = New Size(462, 76)
        GroupBox2.TabIndex = 3
        GroupBox2.TabStop = False
        GroupBox2.Text = "Action"
        ' 
        ' Label13
        ' 
        Label13.AutoSize = True
        Label13.Location = New Point(18, 44)
        Label13.Name = "Label13"
        Label13.Size = New Size(38, 15)
        Label13.TabIndex = 7
        Label13.Text = "Timer"
        ' 
        ' tbTimer
        ' 
        tbTimer.Location = New Point(105, 46)
        tbTimer.Name = "tbTimer"
        tbTimer.Size = New Size(49, 23)
        tbTimer.TabIndex = 9
        tbTimer.Text = "00:00:00"
        ' 
        ' cbDevice
        ' 
        cbDevice.FormattingEnabled = True
        cbDevice.Location = New Point(105, 17)
        cbDevice.Name = "cbDevice"
        cbDevice.Size = New Size(318, 23)
        cbDevice.TabIndex = 5
        ' 
        ' Label7
        ' 
        Label7.AutoSize = True
        Label7.Location = New Point(16, 20)
        Label7.Name = "Label7"
        Label7.Size = New Size(42, 15)
        Label7.TabIndex = 4
        Label7.Text = "Device"
        ' 
        ' cbPalette
        ' 
        cbPalette.FormattingEnabled = True
        cbPalette.Location = New Point(104, 50)
        cbPalette.Name = "cbPalette"
        cbPalette.Size = New Size(203, 23)
        cbPalette.TabIndex = 3
        ' 
        ' Label6
        ' 
        Label6.AutoSize = True
        Label6.Location = New Point(15, 53)
        Label6.Name = "Label6"
        Label6.Size = New Size(43, 15)
        Label6.TabIndex = 2
        Label6.Text = "Palette"
        ' 
        ' cbEffect
        ' 
        cbEffect.FormattingEnabled = True
        cbEffect.Location = New Point(104, 22)
        cbEffect.Name = "cbEffect"
        cbEffect.Size = New Size(203, 23)
        cbEffect.TabIndex = 1
        ' 
        ' Label5
        ' 
        Label5.AutoSize = True
        Label5.Location = New Point(15, 25)
        Label5.Name = "Label5"
        Label5.Size = New Size(37, 15)
        Label5.TabIndex = 0
        Label5.Text = "Effect"
        ' 
        ' GroupBox3
        ' 
        GroupBox3.Controls.Add(txtTransition)
        GroupBox3.Controls.Add(txtSpeed)
        GroupBox3.Controls.Add(txtIntensity)
        GroupBox3.Controls.Add(txtBrightness)
        GroupBox3.Controls.Add(btnColor3)
        GroupBox3.Controls.Add(btnColor2)
        GroupBox3.Controls.Add(btnColor1)
        GroupBox3.Controls.Add(cbBlend)
        GroupBox3.Controls.Add(cbSound)
        GroupBox3.Controls.Add(tbTransition)
        GroupBox3.Controls.Add(Label12)
        GroupBox3.Controls.Add(tbSpeed)
        GroupBox3.Controls.Add(Label11)
        GroupBox3.Controls.Add(tbIntensity)
        GroupBox3.Controls.Add(Label10)
        GroupBox3.Controls.Add(tbBrightness)
        GroupBox3.Controls.Add(Label9)
        GroupBox3.Controls.Add(cbPower)
        GroupBox3.ForeColor = SystemColors.ActiveCaption
        GroupBox3.Location = New Point(15, 79)
        GroupBox3.Name = "GroupBox3"
        GroupBox3.Size = New Size(438, 233)
        GroupBox3.TabIndex = 4
        GroupBox3.TabStop = False
        GroupBox3.Text = "Settings"
        ' 
        ' txtTransition
        ' 
        txtTransition.Location = New Point(323, 152)
        txtTransition.Name = "txtTransition"
        txtTransition.Size = New Size(100, 23)
        txtTransition.TabIndex = 19
        ' 
        ' txtSpeed
        ' 
        txtSpeed.Location = New Point(323, 118)
        txtSpeed.Name = "txtSpeed"
        txtSpeed.Size = New Size(100, 23)
        txtSpeed.TabIndex = 18
        ' 
        ' txtIntensity
        ' 
        txtIntensity.Location = New Point(323, 84)
        txtIntensity.Name = "txtIntensity"
        txtIntensity.Size = New Size(100, 23)
        txtIntensity.TabIndex = 17
        ' 
        ' txtBrightness
        ' 
        txtBrightness.Location = New Point(323, 52)
        txtBrightness.Name = "txtBrightness"
        txtBrightness.Size = New Size(100, 23)
        txtBrightness.TabIndex = 16
        ' 
        ' btnColor3
        ' 
        btnColor3.Location = New Point(271, 200)
        btnColor3.Name = "btnColor3"
        btnColor3.Size = New Size(75, 23)
        btnColor3.TabIndex = 15
        btnColor3.Text = "Color 3"
        btnColor3.UseVisualStyleBackColor = True
        ' 
        ' btnColor2
        ' 
        btnColor2.Location = New Point(190, 200)
        btnColor2.Name = "btnColor2"
        btnColor2.Size = New Size(75, 23)
        btnColor2.TabIndex = 14
        btnColor2.Text = "Color 2"
        btnColor2.UseVisualStyleBackColor = True
        ' 
        ' btnColor1
        ' 
        btnColor1.Location = New Point(112, 200)
        btnColor1.Name = "btnColor1"
        btnColor1.Size = New Size(75, 23)
        btnColor1.TabIndex = 13
        btnColor1.Text = "Color 1"
        btnColor1.UseVisualStyleBackColor = True
        ' 
        ' cbBlend
        ' 
        cbBlend.AutoSize = True
        cbBlend.Location = New Point(332, 27)
        cbBlend.Name = "cbBlend"
        cbBlend.Size = New Size(56, 19)
        cbBlend.TabIndex = 12
        cbBlend.Text = "Blend"
        cbBlend.UseVisualStyleBackColor = True
        cbBlend.Visible = False
        ' 
        ' cbSound
        ' 
        cbSound.AutoSize = True
        cbSound.Location = New Point(256, 27)
        cbSound.Name = "cbSound"
        cbSound.Size = New Size(60, 19)
        cbSound.TabIndex = 11
        cbSound.Text = "Sound"
        cbSound.UseVisualStyleBackColor = True
        cbSound.Visible = False
        ' 
        ' tbTransition
        ' 
        tbTransition.LargeChange = 10
        tbTransition.Location = New Point(105, 155)
        tbTransition.Maximum = 255
        tbTransition.Name = "tbTransition"
        tbTransition.Size = New Size(187, 45)
        tbTransition.TabIndex = 9
        tbTransition.TickFrequency = 10
        ' 
        ' Label12
        ' 
        Label12.AutoSize = True
        Label12.Location = New Point(14, 155)
        Label12.Name = "Label12"
        Label12.Size = New Size(59, 15)
        Label12.TabIndex = 8
        Label12.Text = "Transition"
        ' 
        ' tbSpeed
        ' 
        tbSpeed.LargeChange = 10
        tbSpeed.Location = New Point(105, 121)
        tbSpeed.Maximum = 255
        tbSpeed.Name = "tbSpeed"
        tbSpeed.Size = New Size(187, 45)
        tbSpeed.TabIndex = 7
        tbSpeed.TickFrequency = 10
        ' 
        ' Label11
        ' 
        Label11.AutoSize = True
        Label11.Location = New Point(14, 121)
        Label11.Name = "Label11"
        Label11.Size = New Size(39, 15)
        Label11.TabIndex = 6
        Label11.Text = "Speed"
        ' 
        ' tbIntensity
        ' 
        tbIntensity.LargeChange = 10
        tbIntensity.Location = New Point(105, 87)
        tbIntensity.Maximum = 255
        tbIntensity.Name = "tbIntensity"
        tbIntensity.Size = New Size(187, 45)
        tbIntensity.TabIndex = 5
        tbIntensity.TickFrequency = 10
        ' 
        ' Label10
        ' 
        Label10.AutoSize = True
        Label10.Location = New Point(12, 87)
        Label10.Name = "Label10"
        Label10.Size = New Size(52, 15)
        Label10.TabIndex = 4
        Label10.Text = "Intensity"
        ' 
        ' tbBrightness
        ' 
        tbBrightness.LargeChange = 10
        tbBrightness.Location = New Point(105, 55)
        tbBrightness.Maximum = 255
        tbBrightness.Name = "tbBrightness"
        tbBrightness.Size = New Size(187, 45)
        tbBrightness.TabIndex = 3
        tbBrightness.TickFrequency = 10
        ' 
        ' Label9
        ' 
        Label9.AutoSize = True
        Label9.Location = New Point(12, 55)
        Label9.Name = "Label9"
        Label9.Size = New Size(62, 15)
        Label9.TabIndex = 2
        Label9.Text = "Brightness"
        ' 
        ' cbPower
        ' 
        cbPower.AutoSize = True
        cbPower.Location = New Point(114, 27)
        cbPower.Name = "cbPower"
        cbPower.Size = New Size(59, 19)
        cbPower.TabIndex = 1
        cbPower.Text = "Power"
        cbPower.UseVisualStyleBackColor = True
        ' 
        ' cbAutoPreview
        ' 
        cbAutoPreview.AutoSize = True
        cbAutoPreview.Location = New Point(117, 539)
        cbAutoPreview.Name = "cbAutoPreview"
        cbAutoPreview.Size = New Size(96, 19)
        cbAutoPreview.TabIndex = 13
        cbAutoPreview.Text = "Auto Preview"
        cbAutoPreview.UseVisualStyleBackColor = True
        ' 
        ' btnCopy
        ' 
        btnCopy.ForeColor = SystemColors.Highlight
        btnCopy.Location = New Point(300, 536)
        btnCopy.Name = "btnCopy"
        btnCopy.Size = New Size(75, 23)
        btnCopy.TabIndex = 21
        btnCopy.Text = "Copy"
        btnCopy.UseVisualStyleBackColor = True
        btnCopy.Visible = False
        ' 
        ' btnPaste
        ' 
        btnPaste.ForeColor = SystemColors.Highlight
        btnPaste.Location = New Point(381, 536)
        btnPaste.Name = "btnPaste"
        btnPaste.Size = New Size(75, 23)
        btnPaste.TabIndex = 20
        btnPaste.Text = "Paste"
        btnPaste.UseVisualStyleBackColor = True
        btnPaste.Visible = False
        ' 
        ' pbPreviewPalette
        ' 
        pbPreviewPalette.Location = New Point(313, 50)
        pbPreviewPalette.Name = "pbPreviewPalette"
        pbPreviewPalette.Size = New Size(140, 23)
        pbPreviewPalette.SizeMode = PictureBoxSizeMode.StretchImage
        pbPreviewPalette.TabIndex = 7
        pbPreviewPalette.TabStop = False
        ' 
        ' pbPreviewEffect
        ' 
        pbPreviewEffect.Location = New Point(313, 21)
        pbPreviewEffect.Name = "pbPreviewEffect"
        pbPreviewEffect.Size = New Size(140, 23)
        pbPreviewEffect.SizeMode = PictureBoxSizeMode.StretchImage
        pbPreviewEffect.TabIndex = 5
        pbPreviewEffect.TabStop = False
        ' 
        ' btnPreview
        ' 
        btnPreview.ForeColor = Color.MidnightBlue
        btnPreview.Location = New Point(0, 536)
        btnPreview.Name = "btnPreview"
        btnPreview.Size = New Size(108, 23)
        btnPreview.TabIndex = 12
        btnPreview.Text = "Preview"
        btnPreview.UseVisualStyleBackColor = True
        ' 
        ' GroupBox4
        ' 
        GroupBox4.Controls.Add(cbEffect)
        GroupBox4.Controls.Add(Label6)
        GroupBox4.Controls.Add(pbPreviewPalette)
        GroupBox4.Controls.Add(GroupBox3)
        GroupBox4.Controls.Add(pbPreviewEffect)
        GroupBox4.Controls.Add(cbPalette)
        GroupBox4.Controls.Add(Label5)
        GroupBox4.ForeColor = SystemColors.ActiveCaption
        GroupBox4.Location = New Point(3, 179)
        GroupBox4.Name = "GroupBox4"
        GroupBox4.Size = New Size(462, 328)
        GroupBox4.TabIndex = 14
        GroupBox4.TabStop = False
        GroupBox4.Text = "WLED"
        ' 
        ' SplitContainer1
        ' 
        SplitContainer1.Location = New Point(12, 12)
        SplitContainer1.Name = "SplitContainer1"
        ' 
        ' SplitContainer1.Panel1
        ' 
        SplitContainer1.Panel1.Controls.Add(btnRetrieveFromWLED)
        SplitContainer1.Panel1.Controls.Add(btnCopy)
        SplitContainer1.Panel1.Controls.Add(GroupBox1)
        SplitContainer1.Panel1.Controls.Add(GroupBox4)
        SplitContainer1.Panel1.Controls.Add(btnPaste)
        SplitContainer1.Panel1.Controls.Add(cbAutoPreview)
        SplitContainer1.Panel1.Controls.Add(btnPreview)
        SplitContainer1.Panel1.Controls.Add(GroupBox2)
        ' 
        ' SplitContainer1.Panel2
        ' 
        SplitContainer1.Panel2.Controls.Add(btnCopyToBank)
        SplitContainer1.Panel2.Controls.Add(btnCopyFromBank)
        SplitContainer1.Panel2.Controls.Add(gb_bank)
        SplitContainer1.Panel2.Controls.Add(txtSelectedSlot)
        SplitContainer1.Size = New Size(779, 565)
        SplitContainer1.SplitterDistance = 470
        SplitContainer1.TabIndex = 16
        ' 
        ' btnRetrieveFromWLED
        ' 
        btnRetrieveFromWLED.ForeColor = SystemColors.Highlight
        btnRetrieveFromWLED.Location = New Point(300, 512)
        btnRetrieveFromWLED.Name = "btnRetrieveFromWLED"
        btnRetrieveFromWLED.Size = New Size(156, 23)
        btnRetrieveFromWLED.TabIndex = 22
        btnRetrieveFromWLED.Text = "Retrieve from WLED"
        btnRetrieveFromWLED.UseVisualStyleBackColor = True
        ' 
        ' btnCopyToBank
        ' 
        btnCopyToBank.ForeColor = SystemColors.HotTrack
        btnCopyToBank.Location = New Point(3, 273)
        btnCopyToBank.Name = "btnCopyToBank"
        btnCopyToBank.Size = New Size(46, 23)
        btnCopyToBank.TabIndex = 3
        btnCopyToBank.Text = "→"
        btnCopyToBank.UseVisualStyleBackColor = True
        ' 
        ' btnCopyFromBank
        ' 
        btnCopyFromBank.ForeColor = SystemColors.HotTrack
        btnCopyFromBank.Location = New Point(3, 302)
        btnCopyFromBank.Name = "btnCopyFromBank"
        btnCopyFromBank.Size = New Size(46, 23)
        btnCopyFromBank.TabIndex = 2
        btnCopyFromBank.Text = "←"
        btnCopyFromBank.UseVisualStyleBackColor = True
        ' 
        ' gb_bank
        ' 
        gb_bank.Controls.Add(flpBankSlots)
        gb_bank.ForeColor = SystemColors.ActiveCaption
        gb_bank.Location = New Point(55, 3)
        gb_bank.Name = "gb_bank"
        gb_bank.Size = New Size(228, 559)
        gb_bank.TabIndex = 1
        gb_bank.TabStop = False
        gb_bank.Text = "Bank"
        ' 
        ' flpBankSlots
        ' 
        flpBankSlots.AutoScroll = True
        flpBankSlots.Dock = DockStyle.Fill
        flpBankSlots.Location = New Point(3, 19)
        flpBankSlots.Name = "flpBankSlots"
        flpBankSlots.Size = New Size(222, 537)
        flpBankSlots.TabIndex = 0
        ' 
        ' txtSelectedSlot
        ' 
        txtSelectedSlot.Location = New Point(3, 244)
        txtSelectedSlot.Name = "txtSelectedSlot"
        txtSelectedSlot.Size = New Size(46, 23)
        txtSelectedSlot.TabIndex = 0
        txtSelectedSlot.Visible = False
        ' 
        ' DetailShowWLED
        ' 
        AcceptButton = btnOK
        AutoScaleDimensions = New SizeF(7F, 15F)
        AutoScaleMode = AutoScaleMode.Font
        BackColor = Color.Black
        CancelButton = btnCancel
        ClientSize = New Size(784, 612)
        ControlBox = False
        Controls.Add(SplitContainer1)
        Controls.Add(btnCancel)
        Controls.Add(btnOK)
        ForeColor = SystemColors.ControlLightLight
        MaximizeBox = False
        MinimizeBox = False
        Name = "DetailShowWLED"
        SizeGripStyle = SizeGripStyle.Hide
        Text = "Edit details (WLED)"
        GroupBox1.ResumeLayout(False)
        GroupBox1.PerformLayout()
        GroupBox2.ResumeLayout(False)
        GroupBox2.PerformLayout()
        GroupBox3.ResumeLayout(False)
        GroupBox3.PerformLayout()
        CType(tbTransition, ComponentModel.ISupportInitialize).EndInit()
        CType(tbSpeed, ComponentModel.ISupportInitialize).EndInit()
        CType(tbIntensity, ComponentModel.ISupportInitialize).EndInit()
        CType(tbBrightness, ComponentModel.ISupportInitialize).EndInit()
        CType(pbPreviewPalette, ComponentModel.ISupportInitialize).EndInit()
        CType(pbPreviewEffect, ComponentModel.ISupportInitialize).EndInit()
        GroupBox4.ResumeLayout(False)
        GroupBox4.PerformLayout()
        SplitContainer1.Panel1.ResumeLayout(False)
        SplitContainer1.Panel1.PerformLayout()
        SplitContainer1.Panel2.ResumeLayout(False)
        SplitContainer1.Panel2.PerformLayout()
        CType(SplitContainer1, ComponentModel.ISupportInitialize).EndInit()
        SplitContainer1.ResumeLayout(False)
        gb_bank.ResumeLayout(False)
        ResumeLayout(False)
    End Sub

    Friend WithEvents btnOK As Button
    Friend WithEvents btnCancel As Button
    Friend WithEvents GroupBox1 As GroupBox
    Friend WithEvents tbEvent As TextBox
    Friend WithEvents Label3 As Label
    Friend WithEvents tbScene As TextBox
    Friend WithEvents Label2 As Label
    Friend WithEvents Label1 As Label
    Friend WithEvents tbCue As TextBox
    Friend WithEvents Label4 As Label
    Friend WithEvents GroupBox2 As GroupBox
    Friend WithEvents cbEffect As ComboBox
    Friend WithEvents Label5 As Label
    Friend WithEvents cbPalette As ComboBox
    Friend WithEvents Label6 As Label
    Friend WithEvents cbDevice As ComboBox
    Friend WithEvents Label7 As Label
    Friend WithEvents GroupBox3 As GroupBox
    Friend WithEvents tbSpeed As TrackBar
    Friend WithEvents Label11 As Label
    Friend WithEvents tbIntensity As TrackBar
    Friend WithEvents Label10 As Label
    Friend WithEvents tbBrightness As TrackBar
    Friend WithEvents Label9 As Label
    Friend WithEvents cbPower As CheckBox
    Friend WithEvents btnColor3 As Button
    Friend WithEvents btnColor2 As Button
    Friend WithEvents btnColor1 As Button
    Friend WithEvents cbBlend As CheckBox
    Friend WithEvents cbSound As CheckBox
    Friend WithEvents tbTransition As TrackBar
    Friend WithEvents Label12 As Label
    Friend WithEvents cbAct As ComboBox
    Friend WithEvents tbTimer As TextBox
    Friend WithEvents Label13 As Label
    Friend WithEvents btnPreview As Button
    Friend WithEvents pbPreviewEffect As PictureBox
    Friend WithEvents pbPreviewPalette As PictureBox
    Friend WithEvents txtTransition As TextBox
    Friend WithEvents txtSpeed As TextBox
    Friend WithEvents txtIntensity As TextBox
    Friend WithEvents txtBrightness As TextBox
    Friend WithEvents btnCopy As Button
    Friend WithEvents btnPaste As Button
    Friend WithEvents cbAutoPreview As CheckBox
    Friend WithEvents GroupBox4 As GroupBox
    Friend WithEvents SplitContainer1 As SplitContainer
    Friend WithEvents btnCopyToBank As Button
    Friend WithEvents btnCopyFromBank As Button
    Friend WithEvents gb_bank As GroupBox
    Friend WithEvents txtSelectedSlot As TextBox
    Friend WithEvents flpBankSlots As FlowLayoutPanel
    Friend WithEvents btnRetrieveFromWLED As Button
End Class

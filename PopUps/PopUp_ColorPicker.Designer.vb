<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class PopUp_ColorPicker
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(PopUp_ColorPicker))
        btnOK = New Button()
        btnCancel = New Button()
        pbColorArea = New PictureBox()
        GroupBox1 = New GroupBox()
        pbColorWheel = New PictureBox()
        btnDefaultWindowColorSelector = New Button()
        GroupBox2 = New GroupBox()
        ValueBlue = New NumericUpDown()
        valueGreen = New NumericUpDown()
        valueRed = New NumericUpDown()
        trkBlue = New TrackBar()
        lblBlueTitle = New Label()
        trkGreen = New TrackBar()
        lblGreenTitle = New Label()
        trkRed = New TrackBar()
        lblRedTitle = New Label()
        valueHTML = New TextBox()
        Label1 = New Label()
        GroupBox3 = New GroupBox()
        slot_24 = New PictureBox()
        slot_23 = New PictureBox()
        slot_22 = New PictureBox()
        slot_21 = New PictureBox()
        slot_20 = New PictureBox()
        slot_19 = New PictureBox()
        slot_18 = New PictureBox()
        slot_17 = New PictureBox()
        slot_16 = New PictureBox()
        slot_15 = New PictureBox()
        slot_14 = New PictureBox()
        slot_13 = New PictureBox()
        slot_12 = New PictureBox()
        slot_11 = New PictureBox()
        slot_10 = New PictureBox()
        slot_09 = New PictureBox()
        slot_08 = New PictureBox()
        slot_07 = New PictureBox()
        slot_06 = New PictureBox()
        slot_05 = New PictureBox()
        slot_04 = New PictureBox()
        slot_03 = New PictureBox()
        slot_02 = New PictureBox()
        slot_01 = New PictureBox()
        Label2 = New Label()
        valueSlot = New NumericUpDown()
        btnRestoreFromSlot = New Button()
        btnSaveToSlot = New Button()
        lblHTMLValue = New Label()
        lbRGBValues = New Label()
        GroupBox4 = New GroupBox()
        GroupBox5 = New GroupBox()
        btnRetrieveFromWLED = New Button()
        cbSelectedWLed = New ComboBox()
        CType(pbColorArea, ComponentModel.ISupportInitialize).BeginInit()
        GroupBox1.SuspendLayout()
        CType(pbColorWheel, ComponentModel.ISupportInitialize).BeginInit()
        GroupBox2.SuspendLayout()
        CType(ValueBlue, ComponentModel.ISupportInitialize).BeginInit()
        CType(valueGreen, ComponentModel.ISupportInitialize).BeginInit()
        CType(valueRed, ComponentModel.ISupportInitialize).BeginInit()
        CType(trkBlue, ComponentModel.ISupportInitialize).BeginInit()
        CType(trkGreen, ComponentModel.ISupportInitialize).BeginInit()
        CType(trkRed, ComponentModel.ISupportInitialize).BeginInit()
        GroupBox3.SuspendLayout()
        CType(slot_24, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_23, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_22, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_21, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_20, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_19, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_18, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_17, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_16, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_15, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_14, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_13, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_12, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_11, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_10, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_09, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_08, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_07, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_06, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_05, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_04, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_03, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_02, ComponentModel.ISupportInitialize).BeginInit()
        CType(slot_01, ComponentModel.ISupportInitialize).BeginInit()
        CType(valueSlot, ComponentModel.ISupportInitialize).BeginInit()
        GroupBox4.SuspendLayout()
        GroupBox5.SuspendLayout()
        SuspendLayout()
        ' 
        ' btnOK
        ' 
        btnOK.ForeColor = Color.DarkGreen
        resources.ApplyResources(btnOK, "btnOK")
        btnOK.Name = "btnOK"
        btnOK.UseVisualStyleBackColor = True
        ' 
        ' btnCancel
        ' 
        btnCancel.ForeColor = Color.Red
        resources.ApplyResources(btnCancel, "btnCancel")
        btnCancel.Name = "btnCancel"
        btnCancel.UseVisualStyleBackColor = True
        ' 
        ' pbColorArea
        ' 
        resources.ApplyResources(pbColorArea, "pbColorArea")
        pbColorArea.Cursor = Cursors.Cross
        pbColorArea.Name = "pbColorArea"
        pbColorArea.TabStop = False
        ' 
        ' GroupBox1
        ' 
        GroupBox1.Controls.Add(pbColorWheel)
        GroupBox1.ForeColor = SystemColors.ActiveCaption
        resources.ApplyResources(GroupBox1, "GroupBox1")
        GroupBox1.Name = "GroupBox1"
        GroupBox1.TabStop = False
        ' 
        ' pbColorWheel
        ' 
        pbColorWheel.Cursor = Cursors.Cross
        pbColorWheel.Image = My.Resources.Resources.ColorWheel_WLED
        resources.ApplyResources(pbColorWheel, "pbColorWheel")
        pbColorWheel.Name = "pbColorWheel"
        pbColorWheel.TabStop = False
        ' 
        ' btnDefaultWindowColorSelector
        ' 
        resources.ApplyResources(btnDefaultWindowColorSelector, "btnDefaultWindowColorSelector")
        btnDefaultWindowColorSelector.Name = "btnDefaultWindowColorSelector"
        btnDefaultWindowColorSelector.UseVisualStyleBackColor = True
        ' 
        ' GroupBox2
        ' 
        GroupBox2.Controls.Add(ValueBlue)
        GroupBox2.Controls.Add(valueGreen)
        GroupBox2.Controls.Add(valueRed)
        GroupBox2.Controls.Add(trkBlue)
        GroupBox2.Controls.Add(lblBlueTitle)
        GroupBox2.Controls.Add(trkGreen)
        GroupBox2.Controls.Add(lblGreenTitle)
        GroupBox2.Controls.Add(trkRed)
        GroupBox2.Controls.Add(lblRedTitle)
        GroupBox2.ForeColor = SystemColors.ActiveCaption
        resources.ApplyResources(GroupBox2, "GroupBox2")
        GroupBox2.Name = "GroupBox2"
        GroupBox2.TabStop = False
        ' 
        ' ValueBlue
        ' 
        resources.ApplyResources(ValueBlue, "ValueBlue")
        ValueBlue.Maximum = New Decimal(New Integer() {255, 0, 0, 0})
        ValueBlue.Name = "ValueBlue"
        ' 
        ' valueGreen
        ' 
        resources.ApplyResources(valueGreen, "valueGreen")
        valueGreen.Maximum = New Decimal(New Integer() {255, 0, 0, 0})
        valueGreen.Name = "valueGreen"
        ' 
        ' valueRed
        ' 
        resources.ApplyResources(valueRed, "valueRed")
        valueRed.Maximum = New Decimal(New Integer() {255, 0, 0, 0})
        valueRed.Name = "valueRed"
        ' 
        ' trkBlue
        ' 
        resources.ApplyResources(trkBlue, "trkBlue")
        trkBlue.Maximum = 255
        trkBlue.Name = "trkBlue"
        ' 
        ' lblBlueTitle
        ' 
        resources.ApplyResources(lblBlueTitle, "lblBlueTitle")
        lblBlueTitle.Name = "lblBlueTitle"
        ' 
        ' trkGreen
        ' 
        resources.ApplyResources(trkGreen, "trkGreen")
        trkGreen.Maximum = 255
        trkGreen.Name = "trkGreen"
        ' 
        ' lblGreenTitle
        ' 
        resources.ApplyResources(lblGreenTitle, "lblGreenTitle")
        lblGreenTitle.Name = "lblGreenTitle"
        ' 
        ' trkRed
        ' 
        resources.ApplyResources(trkRed, "trkRed")
        trkRed.Maximum = 255
        trkRed.Name = "trkRed"
        ' 
        ' lblRedTitle
        ' 
        resources.ApplyResources(lblRedTitle, "lblRedTitle")
        lblRedTitle.Name = "lblRedTitle"
        ' 
        ' valueHTML
        ' 
        resources.ApplyResources(valueHTML, "valueHTML")
        valueHTML.Name = "valueHTML"
        ' 
        ' Label1
        ' 
        resources.ApplyResources(Label1, "Label1")
        Label1.Name = "Label1"
        ' 
        ' GroupBox3
        ' 
        GroupBox3.Controls.Add(slot_24)
        GroupBox3.Controls.Add(slot_23)
        GroupBox3.Controls.Add(slot_22)
        GroupBox3.Controls.Add(slot_21)
        GroupBox3.Controls.Add(slot_20)
        GroupBox3.Controls.Add(slot_19)
        GroupBox3.Controls.Add(slot_18)
        GroupBox3.Controls.Add(slot_17)
        GroupBox3.Controls.Add(slot_16)
        GroupBox3.Controls.Add(slot_15)
        GroupBox3.Controls.Add(slot_14)
        GroupBox3.Controls.Add(slot_13)
        GroupBox3.Controls.Add(slot_12)
        GroupBox3.Controls.Add(slot_11)
        GroupBox3.Controls.Add(slot_10)
        GroupBox3.Controls.Add(slot_09)
        GroupBox3.Controls.Add(slot_08)
        GroupBox3.Controls.Add(slot_07)
        GroupBox3.Controls.Add(slot_06)
        GroupBox3.Controls.Add(slot_05)
        GroupBox3.Controls.Add(slot_04)
        GroupBox3.Controls.Add(slot_03)
        GroupBox3.Controls.Add(slot_02)
        GroupBox3.Controls.Add(slot_01)
        GroupBox3.ForeColor = SystemColors.ActiveCaption
        resources.ApplyResources(GroupBox3, "GroupBox3")
        GroupBox3.Name = "GroupBox3"
        GroupBox3.TabStop = False
        ' 
        ' slot_24
        ' 
        slot_24.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_24, "slot_24")
        slot_24.Name = "slot_24"
        slot_24.TabStop = False
        ' 
        ' slot_23
        ' 
        slot_23.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_23, "slot_23")
        slot_23.Name = "slot_23"
        slot_23.TabStop = False
        ' 
        ' slot_22
        ' 
        slot_22.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_22, "slot_22")
        slot_22.Name = "slot_22"
        slot_22.TabStop = False
        ' 
        ' slot_21
        ' 
        slot_21.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_21, "slot_21")
        slot_21.Name = "slot_21"
        slot_21.TabStop = False
        ' 
        ' slot_20
        ' 
        slot_20.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_20, "slot_20")
        slot_20.Name = "slot_20"
        slot_20.TabStop = False
        ' 
        ' slot_19
        ' 
        slot_19.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_19, "slot_19")
        slot_19.Name = "slot_19"
        slot_19.TabStop = False
        ' 
        ' slot_18
        ' 
        slot_18.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_18, "slot_18")
        slot_18.Name = "slot_18"
        slot_18.TabStop = False
        ' 
        ' slot_17
        ' 
        slot_17.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_17, "slot_17")
        slot_17.Name = "slot_17"
        slot_17.TabStop = False
        ' 
        ' slot_16
        ' 
        slot_16.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_16, "slot_16")
        slot_16.Name = "slot_16"
        slot_16.TabStop = False
        ' 
        ' slot_15
        ' 
        slot_15.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_15, "slot_15")
        slot_15.Name = "slot_15"
        slot_15.TabStop = False
        ' 
        ' slot_14
        ' 
        slot_14.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_14, "slot_14")
        slot_14.Name = "slot_14"
        slot_14.TabStop = False
        ' 
        ' slot_13
        ' 
        slot_13.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_13, "slot_13")
        slot_13.Name = "slot_13"
        slot_13.TabStop = False
        ' 
        ' slot_12
        ' 
        slot_12.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_12, "slot_12")
        slot_12.Name = "slot_12"
        slot_12.TabStop = False
        ' 
        ' slot_11
        ' 
        slot_11.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_11, "slot_11")
        slot_11.Name = "slot_11"
        slot_11.TabStop = False
        ' 
        ' slot_10
        ' 
        slot_10.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_10, "slot_10")
        slot_10.Name = "slot_10"
        slot_10.TabStop = False
        ' 
        ' slot_09
        ' 
        slot_09.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_09, "slot_09")
        slot_09.Name = "slot_09"
        slot_09.TabStop = False
        ' 
        ' slot_08
        ' 
        slot_08.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_08, "slot_08")
        slot_08.Name = "slot_08"
        slot_08.TabStop = False
        ' 
        ' slot_07
        ' 
        slot_07.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_07, "slot_07")
        slot_07.Name = "slot_07"
        slot_07.TabStop = False
        ' 
        ' slot_06
        ' 
        slot_06.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_06, "slot_06")
        slot_06.Name = "slot_06"
        slot_06.TabStop = False
        ' 
        ' slot_05
        ' 
        slot_05.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_05, "slot_05")
        slot_05.Name = "slot_05"
        slot_05.TabStop = False
        ' 
        ' slot_04
        ' 
        slot_04.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_04, "slot_04")
        slot_04.Name = "slot_04"
        slot_04.TabStop = False
        ' 
        ' slot_03
        ' 
        slot_03.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_03, "slot_03")
        slot_03.Name = "slot_03"
        slot_03.TabStop = False
        ' 
        ' slot_02
        ' 
        slot_02.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_02, "slot_02")
        slot_02.Name = "slot_02"
        slot_02.TabStop = False
        ' 
        ' slot_01
        ' 
        slot_01.BorderStyle = BorderStyle.FixedSingle
        resources.ApplyResources(slot_01, "slot_01")
        slot_01.Name = "slot_01"
        slot_01.TabStop = False
        slot_01.Tag = "1"
        ' 
        ' Label2
        ' 
        resources.ApplyResources(Label2, "Label2")
        Label2.Name = "Label2"
        ' 
        ' valueSlot
        ' 
        resources.ApplyResources(valueSlot, "valueSlot")
        valueSlot.Maximum = New Decimal(New Integer() {10, 0, 0, 0})
        valueSlot.Name = "valueSlot"
        ' 
        ' btnRestoreFromSlot
        ' 
        resources.ApplyResources(btnRestoreFromSlot, "btnRestoreFromSlot")
        btnRestoreFromSlot.Name = "btnRestoreFromSlot"
        btnRestoreFromSlot.UseVisualStyleBackColor = True
        ' 
        ' btnSaveToSlot
        ' 
        resources.ApplyResources(btnSaveToSlot, "btnSaveToSlot")
        btnSaveToSlot.Name = "btnSaveToSlot"
        btnSaveToSlot.UseVisualStyleBackColor = True
        ' 
        ' lblHTMLValue
        ' 
        resources.ApplyResources(lblHTMLValue, "lblHTMLValue")
        lblHTMLValue.Name = "lblHTMLValue"
        ' 
        ' lbRGBValues
        ' 
        resources.ApplyResources(lbRGBValues, "lbRGBValues")
        lbRGBValues.Name = "lbRGBValues"
        ' 
        ' GroupBox4
        ' 
        GroupBox4.Controls.Add(valueHTML)
        GroupBox4.Controls.Add(Label1)
        GroupBox4.ForeColor = SystemColors.ActiveCaption
        resources.ApplyResources(GroupBox4, "GroupBox4")
        GroupBox4.Name = "GroupBox4"
        GroupBox4.TabStop = False
        ' 
        ' GroupBox5
        ' 
        GroupBox5.Controls.Add(btnRetrieveFromWLED)
        GroupBox5.Controls.Add(cbSelectedWLed)
        GroupBox5.ForeColor = SystemColors.ActiveCaption
        resources.ApplyResources(GroupBox5, "GroupBox5")
        GroupBox5.Name = "GroupBox5"
        GroupBox5.TabStop = False
        ' 
        ' btnRetrieveFromWLED
        ' 
        btnRetrieveFromWLED.ForeColor = Color.Navy
        resources.ApplyResources(btnRetrieveFromWLED, "btnRetrieveFromWLED")
        btnRetrieveFromWLED.Name = "btnRetrieveFromWLED"
        btnRetrieveFromWLED.UseVisualStyleBackColor = True
        ' 
        ' cbSelectedWLed
        ' 
        cbSelectedWLed.FormattingEnabled = True
        resources.ApplyResources(cbSelectedWLed, "cbSelectedWLed")
        cbSelectedWLed.Name = "cbSelectedWLed"
        ' 
        ' ColorPickerExtented
        ' 
        AcceptButton = btnOK
        resources.ApplyResources(Me, "$this")
        AutoScaleMode = AutoScaleMode.Font
        BackColor = Color.Black
        CancelButton = btnCancel
        ControlBox = False
        Controls.Add(btnDefaultWindowColorSelector)
        Controls.Add(GroupBox5)
        Controls.Add(GroupBox4)
        Controls.Add(lbRGBValues)
        Controls.Add(lblHTMLValue)
        Controls.Add(btnSaveToSlot)
        Controls.Add(btnRestoreFromSlot)
        Controls.Add(valueSlot)
        Controls.Add(Label2)
        Controls.Add(GroupBox3)
        Controls.Add(GroupBox2)
        Controls.Add(GroupBox1)
        Controls.Add(pbColorArea)
        Controls.Add(btnCancel)
        Controls.Add(btnOK)
        FormBorderStyle = FormBorderStyle.FixedDialog
        MaximizeBox = False
        MinimizeBox = False
        Name = "ColorPickerExtented"
        ShowInTaskbar = False
        CType(pbColorArea, ComponentModel.ISupportInitialize).EndInit()
        GroupBox1.ResumeLayout(False)
        CType(pbColorWheel, ComponentModel.ISupportInitialize).EndInit()
        GroupBox2.ResumeLayout(False)
        GroupBox2.PerformLayout()
        CType(ValueBlue, ComponentModel.ISupportInitialize).EndInit()
        CType(valueGreen, ComponentModel.ISupportInitialize).EndInit()
        CType(valueRed, ComponentModel.ISupportInitialize).EndInit()
        CType(trkBlue, ComponentModel.ISupportInitialize).EndInit()
        CType(trkGreen, ComponentModel.ISupportInitialize).EndInit()
        CType(trkRed, ComponentModel.ISupportInitialize).EndInit()
        GroupBox3.ResumeLayout(False)
        CType(slot_24, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_23, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_22, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_21, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_20, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_19, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_18, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_17, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_16, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_15, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_14, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_13, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_12, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_11, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_10, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_09, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_08, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_07, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_06, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_05, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_04, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_03, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_02, ComponentModel.ISupportInitialize).EndInit()
        CType(slot_01, ComponentModel.ISupportInitialize).EndInit()
        CType(valueSlot, ComponentModel.ISupportInitialize).EndInit()
        GroupBox4.ResumeLayout(False)
        GroupBox4.PerformLayout()
        GroupBox5.ResumeLayout(False)
        ResumeLayout(False)
        PerformLayout()
    End Sub

    Friend WithEvents btnOK As Button
    Friend WithEvents btnCancel As Button
    Friend WithEvents pbColorArea As PictureBox
    Friend WithEvents GroupBox1 As GroupBox
    Friend WithEvents btnDefaultWindowColorSelector As Button
    Friend WithEvents pbColorWheel As PictureBox
    Friend WithEvents GroupBox2 As GroupBox
    Friend WithEvents GroupBox3 As GroupBox
    Friend WithEvents lblRedTitle As Label
    Friend WithEvents trkRed As TrackBar
    Friend WithEvents trkGreen As TrackBar
    Friend WithEvents lblGreenTitle As Label
    Friend WithEvents trkBlue As TrackBar
    Friend WithEvents lblBlueTitle As Label
    Friend WithEvents ValueBlue As NumericUpDown
    Friend WithEvents valueGreen As NumericUpDown
    Friend WithEvents valueRed As NumericUpDown
    Friend WithEvents valueHTML As TextBox
    Friend WithEvents Label1 As Label
    Friend WithEvents Label2 As Label
    Friend WithEvents slot_24 As PictureBox
    Friend WithEvents slot_23 As PictureBox
    Friend WithEvents slot_22 As PictureBox
    Friend WithEvents slot_21 As PictureBox
    Friend WithEvents slot_20 As PictureBox
    Friend WithEvents slot_19 As PictureBox
    Friend WithEvents slot_18 As PictureBox
    Friend WithEvents slot_17 As PictureBox
    Friend WithEvents slot_16 As PictureBox
    Friend WithEvents slot_15 As PictureBox
    Friend WithEvents slot_14 As PictureBox
    Friend WithEvents slot_13 As PictureBox
    Friend WithEvents slot_12 As PictureBox
    Friend WithEvents slot_11 As PictureBox
    Friend WithEvents slot_10 As PictureBox
    Friend WithEvents slot_09 As PictureBox
    Friend WithEvents slot_08 As PictureBox
    Friend WithEvents slot_07 As PictureBox
    Friend WithEvents slot_06 As PictureBox
    Friend WithEvents slot_05 As PictureBox
    Friend WithEvents slot_04 As PictureBox
    Friend WithEvents slot_03 As PictureBox
    Friend WithEvents slot_02 As PictureBox
    Friend WithEvents slot_01 As PictureBox
    Friend WithEvents valueSlot As NumericUpDown
    Friend WithEvents btnRestoreFromSlot As Button
    Friend WithEvents btnSaveToSlot As Button
    Friend WithEvents lblHTMLValue As Label
    Friend WithEvents lbRGBValues As Label
    Friend WithEvents GroupBox4 As GroupBox
    Friend WithEvents GroupBox5 As GroupBox
    Friend WithEvents btnRetrieveFromWLED As Button
    Friend WithEvents cbSelectedWLed As ComboBox
End Class

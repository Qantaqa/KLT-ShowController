<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class PopUp_DetailShowVideo
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
        cbPower = New CheckBox()
        GroupBox3 = New GroupBox()
        Button1 = New Button()
        Label5 = New Label()
        tbFileName = New TextBox()
        cbRepeat = New CheckBox()
        btnCancel = New Button()
        btnOK = New Button()
        cbSound = New CheckBox()
        GroupBox1.SuspendLayout()
        GroupBox2.SuspendLayout()
        GroupBox3.SuspendLayout()
        SuspendLayout()
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
        GroupBox1.ForeColor = SystemColors.ControlLightLight
        GroupBox1.Location = New Point(12, 12)
        GroupBox1.Name = "GroupBox1"
        GroupBox1.Size = New Size(462, 88)
        GroupBox1.TabIndex = 4
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
        GroupBox2.ForeColor = SystemColors.ControlLightLight
        GroupBox2.Location = New Point(12, 106)
        GroupBox2.Name = "GroupBox2"
        GroupBox2.Size = New Size(462, 76)
        GroupBox2.TabIndex = 5
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
        ' cbPower
        ' 
        cbPower.AutoSize = True
        cbPower.Location = New Point(15, 35)
        cbPower.Name = "cbPower"
        cbPower.Size = New Size(59, 19)
        cbPower.TabIndex = 6
        cbPower.Text = "Power"
        cbPower.UseVisualStyleBackColor = True
        ' 
        ' GroupBox3
        ' 
        GroupBox3.Controls.Add(cbSound)
        GroupBox3.Controls.Add(Button1)
        GroupBox3.Controls.Add(Label5)
        GroupBox3.Controls.Add(tbFileName)
        GroupBox3.Controls.Add(cbRepeat)
        GroupBox3.Controls.Add(cbPower)
        GroupBox3.ForeColor = SystemColors.ControlLight
        GroupBox3.Location = New Point(12, 188)
        GroupBox3.Name = "GroupBox3"
        GroupBox3.Size = New Size(464, 159)
        GroupBox3.TabIndex = 7
        GroupBox3.TabStop = False
        GroupBox3.Text = "Video"
        ' 
        ' Button1
        ' 
        Button1.ForeColor = SystemColors.ActiveCaptionText
        Button1.Location = New Point(429, 86)
        Button1.Name = "Button1"
        Button1.Size = New Size(23, 23)
        Button1.TabIndex = 11
        Button1.Text = "..."
        Button1.UseVisualStyleBackColor = True
        ' 
        ' Label5
        ' 
        Label5.AutoSize = True
        Label5.Location = New Point(15, 90)
        Label5.Name = "Label5"
        Label5.Size = New Size(56, 15)
        Label5.TabIndex = 10
        Label5.Text = "Video file"
        ' 
        ' tbFileName
        ' 
        tbFileName.Location = New Point(100, 87)
        tbFileName.Name = "tbFileName"
        tbFileName.Size = New Size(323, 23)
        tbFileName.TabIndex = 9
        ' 
        ' cbRepeat
        ' 
        cbRepeat.AutoSize = True
        cbRepeat.Location = New Point(15, 60)
        cbRepeat.Name = "cbRepeat"
        cbRepeat.Size = New Size(62, 19)
        cbRepeat.TabIndex = 8
        cbRepeat.Text = "Repeat"
        cbRepeat.UseVisualStyleBackColor = True
        ' 
        ' btnCancel
        ' 
        btnCancel.ForeColor = Color.Red
        btnCancel.Location = New Point(12, 354)
        btnCancel.Name = "btnCancel"
        btnCancel.Size = New Size(108, 22)
        btnCancel.TabIndex = 9
        btnCancel.Text = "Cancel"
        btnCancel.UseVisualStyleBackColor = True
        ' 
        ' btnOK
        ' 
        btnOK.ForeColor = SystemColors.Highlight
        btnOK.Location = New Point(399, 353)
        btnOK.Name = "btnOK"
        btnOK.Size = New Size(75, 22)
        btnOK.TabIndex = 8
        btnOK.Text = "OK"
        btnOK.UseVisualStyleBackColor = True
        ' 
        ' cbSound
        ' 
        cbSound.AutoSize = True
        cbSound.Location = New Point(100, 60)
        cbSound.Name = "cbSound"
        cbSound.Size = New Size(60, 19)
        cbSound.TabIndex = 12
        cbSound.Text = "Sound"
        cbSound.UseVisualStyleBackColor = True
        ' 
        ' DetailShowVideo
        ' 
        AcceptButton = btnOK
        AutoScaleDimensions = New SizeF(7F, 15F)
        AutoScaleMode = AutoScaleMode.Font
        BackColor = Color.Black
        CancelButton = btnCancel
        ClientSize = New Size(485, 383)
        ControlBox = False
        Controls.Add(btnCancel)
        Controls.Add(btnOK)
        Controls.Add(GroupBox3)
        Controls.Add(GroupBox1)
        Controls.Add(GroupBox2)
        ForeColor = SystemColors.ControlLightLight
        MaximizeBox = False
        MinimizeBox = False
        Name = "DetailShowVideo"
        Text = "Edit details (Video)"
        GroupBox1.ResumeLayout(False)
        GroupBox1.PerformLayout()
        GroupBox2.ResumeLayout(False)
        GroupBox2.PerformLayout()
        GroupBox3.ResumeLayout(False)
        GroupBox3.PerformLayout()
        ResumeLayout(False)
    End Sub

    Friend WithEvents GroupBox1 As GroupBox
    Friend WithEvents cbAct As ComboBox
    Friend WithEvents tbCue As TextBox
    Friend WithEvents Label4 As Label
    Friend WithEvents tbEvent As TextBox
    Friend WithEvents Label3 As Label
    Friend WithEvents tbScene As TextBox
    Friend WithEvents Label2 As Label
    Friend WithEvents Label1 As Label
    Friend WithEvents GroupBox2 As GroupBox
    Friend WithEvents Label13 As Label
    Friend WithEvents tbTimer As TextBox
    Friend WithEvents cbDevice As ComboBox
    Friend WithEvents Label7 As Label
    Friend WithEvents cbPower As CheckBox
    Friend WithEvents GroupBox3 As GroupBox
    Friend WithEvents cbRepeat As CheckBox
    Friend WithEvents Label5 As Label
    Friend WithEvents tbFileName As TextBox
    Friend WithEvents btnCancel As Button
    Friend WithEvents btnOK As Button
    Friend WithEvents Button1 As Button
    Friend WithEvents cbSound As CheckBox
End Class

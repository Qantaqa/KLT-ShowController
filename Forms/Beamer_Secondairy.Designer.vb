<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class Beamer_Secondairy
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
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(Beamer_Secondairy))
        WMP_SecondairyPlayer_Live = New AxWMPLib.AxWindowsMediaPlayer()
        CType(WMP_SecondairyPlayer_Live, ComponentModel.ISupportInitialize).BeginInit()
        SuspendLayout()
        ' 
        ' WMP_SecondairyPlayer_Live
        ' 
        WMP_SecondairyPlayer_Live.Dock = DockStyle.Fill
        WMP_SecondairyPlayer_Live.Enabled = True
        WMP_SecondairyPlayer_Live.Location = New Point(0, 0)
        WMP_SecondairyPlayer_Live.Name = "WMP_SecondairyPlayer_Live"
        WMP_SecondairyPlayer_Live.OcxState = CType(resources.GetObject("WMP_SecondairyPlayer_Live.OcxState"), AxHost.State)
        WMP_SecondairyPlayer_Live.Size = New Size(800, 450)
        WMP_SecondairyPlayer_Live.TabIndex = 7
        ' 
        ' Beamer_Secondairy
        ' 
        AutoScaleDimensions = New SizeF(7F, 15F)
        AutoScaleMode = AutoScaleMode.Font
        BackColor = Color.Black
        BackgroundImageLayout = ImageLayout.None
        ClientSize = New Size(800, 450)
        Controls.Add(WMP_SecondairyPlayer_Live)
        DoubleBuffered = True
        FormBorderStyle = FormBorderStyle.None
        Name = "Beamer_Secondairy"
        StartPosition = FormStartPosition.CenterScreen
        Text = "Beamer_2"
        CType(WMP_SecondairyPlayer_Live, ComponentModel.ISupportInitialize).EndInit()
        ResumeLayout(False)
    End Sub
    Friend WithEvents WMP_SecondairyPlayer_Live As AxWMPLib.AxWindowsMediaPlayer
End Class

Public Class PopUp_DetailShowVideo
    Public Property RowData As Dictionary(Of String, Object)

    Public Sub New(rowData As Dictionary(Of String, Object))
        InitializeComponent()
        Me.RowData = rowData
        InitializeFieldsFromRowData()
    End Sub

    Private Sub InitializeFieldsFromRowData()
        On Error Resume Next

        If RowData.ContainsKey("colAct") Then cbAct.Text = RowData("colAct").ToString()
        If RowData.ContainsKey("colSceneID") Then tbScene.Text = RowData("colSceneID").ToString()
        If RowData.ContainsKey("colEventId") Then tbEvent.Text = RowData("colEventId").ToString()
        If RowData.ContainsKey("colTimer") Then tbTimer.Text = RowData("colTimer").ToString()
        If RowData.ContainsKey("colCue") Then tbCue.Text = RowData("colCue").ToString()
        If RowData.ContainsKey("colFixture") Then cbDevice.Text = RowData("colFixture").ToString()

        cbPower.Checked = True
        If RowData.ContainsKey("colStateOnOff") Then
            If (RowData("colStateOnOff").ToString = "Uit" Or RowData("colStateOnOff").ToString = "Aan") Then
                Select Case (RowData("colStateOnOff").ToString.ToLower)
                    Case "uit"
                        cbPower.Checked = False
                    Case "aan"
                        cbPower.Checked = True
                    Case "true"
                        cbPower.Checked = True
                    Case "false"
                        cbPower.Checked = False
                    Case Else
                        cbPower.Checked = True
                End Select
            End If
        End If
        If RowData.ContainsKey("colRepeat") Then cbRepeat.Checked = Convert.ToBoolean(RowData("colRepeat"))
        If RowData.ContainsKey("colSound") Then cbSound.Checked = Convert.ToBoolean(RowData("colSound"))
        If RowData.ContainsKey("colFilename") Then tbFilename.Text = RowData("colFilename").ToString()
    End Sub



    Private Sub UpdateRowDataFromFields()
        RowData("colAct") = cbAct.Text
        RowData("colSceneID") = tbScene.Text
        RowData("colEventId") = tbEvent.Text
        RowData("colTimer") = tbTimer.Text
        RowData("colCue") = tbCue.Text
        RowData("colFixture") = cbDevice.Text
        RowData("colStateOnOff") = cbPower.Checked
        RowData("colRepeat") = cbRepeat.Checked
        RowData("colSound") = cbSound.Checked
        RowData("colFilename") = tbFileName.Text

    End Sub

    ' Call this when Cancel is pressed

    Private Sub btnOK_Click_1(sender As Object, e As EventArgs) Handles btnOK.Click
        UpdateRowDataFromFields()
        DialogResult = DialogResult.OK
        Close()

    End Sub

    Private Sub btnCancel_Click(sender As Object, e As EventArgs) Handles btnCancel.Click
        DialogResult = DialogResult.Cancel
        Close()
    End Sub

    Private Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click
        Using dlg As New OpenFileDialog
            dlg.Title = "Select Movie File"
            dlg.Filter = "Video Files|*.mp4;*.avi;*.mov;*.mkv|All Files|*.*"
            dlg.CheckFileExists = True
            dlg.CheckPathExists = True
            If dlg.ShowDialog = DialogResult.OK Then
                tbFileName.Text = dlg.FileName
            End If
        End Using

    End Sub

    Private Sub DetailShowVideo_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        ' Zorg dat het formulier op hetzelfde scherm als FrmMain verschijnt, rechtsonder
        Dim mainScreen = Screen.FromControl(FrmMain)
        Dim screenBounds = mainScreen.WorkingArea

        Me.StartPosition = FormStartPosition.Manual
        Me.Location = New Point(
            screenBounds.Right - Me.Width - 40,
            screenBounds.Bottom - Me.Height - 40
        )
    End Sub


End Class
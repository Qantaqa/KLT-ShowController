Imports System.IO
Imports System.Xml.Serialization
Imports System.Runtime.InteropServices.Marshalling

Public Class DetailShowWLED
    Public Property RowData As Dictionary(Of String, Object)

    Public Sub New(rowData As Dictionary(Of String, Object))
        InitializeComponent()
        Me.RowData = rowData
        PopulatePulldownLists()
        InitializeFieldsFromRowData()
        InitializeBankUI() ' Added initialization of bank UI
    End Sub

    Private Sub DetailShowWLED_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        ' Zorg dat het formulier op hetzelfde scherm als FrmMain verschijnt, rechtsonder
        Dim mainScreen = Screen.FromControl(FrmMain)
        Dim screenBounds = mainScreen.WorkingArea

        Me.StartPosition = FormStartPosition.Manual
        Me.Location = New Point(
            screenBounds.Right - Me.Width - 40,
            screenBounds.Bottom - Me.Height - 40
        )
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
        If RowData.ContainsKey("colEffect") Then cbEffect.Text = RowData("colEffect").ToString()
        If RowData.ContainsKey("colPalette") Then cbPalette.Text = RowData("colPalette").ToString()
        If RowData.ContainsKey("colColor1") Then btnColor1.BackColor = ColorTranslator.FromHtml(RowData("colColor1").ToString())
        If RowData.ContainsKey("colColor2") Then btnColor2.BackColor = ColorTranslator.FromHtml(RowData("colColor2").ToString())
        If RowData.ContainsKey("colColor3") Then btnColor3.BackColor = ColorTranslator.FromHtml(RowData("colColor3").ToString())
        If RowData.ContainsKey("colBrightness") Then tbBrightness.Value = Convert.ToInt32(RowData("colBrightness"))
        If RowData.ContainsKey("colSpeed") Then tbSpeed.Value = Convert.ToInt32(RowData("colSpeed"))
        If RowData.ContainsKey("colIntensity") Then tbIntensity.Value = Convert.ToInt32(RowData("colIntensity"))
        If RowData.ContainsKey("colTransition") Then tbTransition.Value = Convert.ToInt32(RowData("colTransition"))
        If RowData.ContainsKey("colBlend") Then cbBlend.Checked = Convert.ToBoolean(RowData("colBlend"))
        If RowData.ContainsKey("colSound") Then cbSound.Checked = Convert.ToBoolean(RowData("colSound"))
    End Sub

    Private Sub PopulatePulldownLists()
        ' Access the main form instance
        Dim mainForm As FrmMain = CType(Application.OpenForms("FrmMain"), FrmMain)
        If mainForm Is Nothing Then Return

        ' --- Effects ---
        cbEffect.Items.Clear()
        For Each row As DataGridViewRow In mainForm.DG_Effecten.Rows
            If row.IsNewRow Then Continue For
            Dim effectName = TryCast(row.Cells(0).Value, String)
            If Not String.IsNullOrEmpty(effectName) Then
                cbEffect.Items.Add(effectName)
            End If
        Next

        ' --- Palettes ---
        cbPalette.Items.Clear()
        For Each row As DataGridViewRow In mainForm.DG_Paletten.Rows
            If row.IsNewRow Then Continue For
            Dim paletteName = TryCast(row.Cells(0).Value, String)
            If Not String.IsNullOrEmpty(paletteName) Then
                cbPalette.Items.Add(paletteName)
            End If
        Next

        ' --- Devices (Fixtures) from DG_Groups ---
        cbDevice.Items.Clear()
        ' Add fixed video outputs first
        cbDevice.Items.Add("** Video **/ Primairy")
        cbDevice.Items.Add("** Video **/ Secondairy")

        For Each row As DataGridViewRow In mainForm.DG_Groups.Rows
            If row.IsNewRow Then Continue For
            Dim device = TryCast(row.Cells("colGroupFixture").Value, String)
            Dim groupNumber = TryCast(row.Cells("colGroupSegment").Value, Object)
            If Not String.IsNullOrEmpty(device) Then
                Dim groupStr = If(groupNumber IsNot Nothing, groupNumber.ToString(), "").Trim()
                If groupStr <> "" Then
                    cbDevice.Items.Add($"{device}/{groupStr}")
                Else
                    cbDevice.Items.Add(device)
                End If
            End If
        Next
    End Sub

    ' Call this when OK is pressed
    Private Sub btnOK_Click(sender As Object, e As EventArgs) Handles btnOK.Click
        UpdateRowDataFromFields()
        Me.DialogResult = DialogResult.OK
        Me.Close()
    End Sub

    Private Sub UpdateRowDataFromFields()
        RowData("colAct") = cbAct.Text
        RowData("colSceneID") = tbScene.Text
        RowData("colEventId") = tbEvent.Text
        RowData("colTimer") = tbTimer.Text
        RowData("colCue") = tbCue.Text
        RowData("colFixture") = cbDevice.Text
        RowData("colStateOnOff") = cbPower.Checked
        RowData("colEffect") = cbEffect.Text
        RowData("colPalette") = cbPalette.Text
        RowData("colColor1") = ColorTranslator.ToHtml(btnColor1.BackColor)
        RowData("colColor2") = ColorTranslator.ToHtml(btnColor2.BackColor)
        RowData("colColor3") = ColorTranslator.ToHtml(btnColor3.BackColor)
        RowData("colBrightness") = tbBrightness.Value
        RowData("colSpeed") = tbSpeed.Value
        RowData("colIntensity") = tbIntensity.Value
        RowData("colTransition") = tbTransition.Value
        RowData("colBlend") = cbBlend.Checked

        RowData("colSound") = cbSound.Checked


        ' Lookup EffectId from DG_Effecten
        Dim mainForm As FrmMain = CType(Application.OpenForms("FrmMain"), FrmMain)
        If mainForm IsNot Nothing Then
            RowData("colEffectId") = Nothing
            For Each row As DataGridViewRow In mainForm.DG_Effecten.Rows
                If row.IsNewRow Then Continue For
                If String.Equals(CStr(row.Cells(0).Value), cbEffect.Text, StringComparison.OrdinalIgnoreCase) Then
                    RowData("colEffectId") = row.Cells(1).Value
                    Exit For
                End If
            Next

            ' Lookup PaletteId from DG_Paletten
            RowData("colPaletteId") = Nothing
            For Each row As DataGridViewRow In mainForm.DG_Paletten.Rows
                If row.IsNewRow Then Continue For
                If String.Equals(CStr(row.Cells(0).Value), cbPalette.Text, StringComparison.OrdinalIgnoreCase) Then
                    RowData("colPaletteId") = row.Cells(1).Value
                    Exit For
                End If
            Next
        End If
    End Sub

    ' Call this when Cancel is pressed

    Private Sub btnCancel_Click(sender As Object, e As EventArgs) Handles btnCancel.Click
        Me.DialogResult = DialogResult.Cancel
        Me.Close()
    End Sub

    Private Sub SendPreviewIfAuto()
        If cbAutoPreview IsNot Nothing AndAlso cbAutoPreview.Checked Then
            UpdateRowDataFromFields()
            btnPreview_Click(Nothing, EventArgs.Empty)
        End If
    End Sub

    Private Sub btnColor1_Click(sender As Object, e As EventArgs) Handles btnColor1.Click
        Using dlg As New ColorPickerExtented()
            dlg.SelectedColor = btnColor1.BackColor
            If dlg.ShowDialog() = DialogResult.OK Then
                btnColor1.BackColor = dlg.SelectedColor
                SendPreviewIfAuto()
            End If
        End Using
    End Sub

    Private Sub btnColor2_Click(sender As Object, e As EventArgs) Handles btnColor2.Click
        Using dlg As New ColorPickerExtented()
            dlg.SelectedColor = btnColor2.BackColor
            If dlg.ShowDialog() = DialogResult.OK Then
                btnColor2.BackColor = dlg.SelectedColor
                SendPreviewIfAuto()
            End If
        End Using
    End Sub

    Private Sub btnColor3_Click(sender As Object, e As EventArgs) Handles btnColor3.Click
        Using dlg As New ColorPickerExtented()
            dlg.SelectedColor = btnColor3.BackColor
            If dlg.ShowDialog() = DialogResult.OK Then
                btnColor3.BackColor = dlg.SelectedColor
                SendPreviewIfAuto()
            End If
        End Using
    End Sub



    Private Sub btnPreview_Click(sender As Object, e As EventArgs) Handles btnPreview.Click
        UpdateRowDataFromFields()
        Dim mainForm As FrmMain = CType(Application.OpenForms("FrmMain"), FrmMain)
        If mainForm Is Nothing Then Return

        Dim fixtureValue = If(RowData.ContainsKey("colFixture"), RowData("colFixture"), Nothing)
        If fixtureValue Is Nothing OrElse fixtureValue.ToString().Trim() = "" Then Return

        Dim fixtureParts = fixtureValue.ToString().Split("/"c)
        If fixtureParts.Length = 2 Then
            ' Device with segment: normal behavior
            WLEDControl.Apply_RowData_ToWLED(RowData, mainForm.DG_Devices, mainForm.DG_Effecten, mainForm.DG_Paletten)
            ToonFlashBericht("Preview sent to device.", 2)
        ElseIf fixtureParts.Length = 1 Then
            ' Device without segment: apply to all segments
            Dim wledName = fixtureParts(0).Trim()
            ' Find the device row
            Dim devRow As DataGridViewRow = Nothing
            For Each row As DataGridViewRow In mainForm.DG_Devices.Rows
                If row.IsNewRow Then Continue For
                If String.Equals(CStr(row.Cells("colInstance").Value), wledName, StringComparison.OrdinalIgnoreCase) Then
                    devRow = row
                    Exit For
                End If
            Next
            If devRow Is Nothing Then Return

            ' Get segments from colSegments (format: "(0-49),(50-99)", etc.)
            Dim segmentsStr = CStr(devRow.Cells("colSegments").Value)
            If String.IsNullOrWhiteSpace(segmentsStr) Then Return

            Dim segmentMatches = System.Text.RegularExpressions.Regex.Matches(segmentsStr, "\((\d+)-(\d+)\)")
            Dim segmentIndex As Integer = 0
            For Each m As System.Text.RegularExpressions.Match In segmentMatches
                ' For each segment, set RowData("colFixture") to "DeviceName/SegmentIndex"
                Dim tempRowData = New Dictionary(Of String, Object)(RowData)
                tempRowData("colFixture") = wledName & "/" & segmentIndex.ToString()
                WLEDControl.Apply_RowData_ToWLED(tempRowData, mainForm.DG_Devices, mainForm.DG_Effecten, mainForm.DG_Paletten)
                segmentIndex += 1
            Next
            ToonFlashBericht("Preview sent to all segments of device.", 2)
        End If
    End Sub

    Private Sub cbPalette_SelectedIndexChanged(sender As Object, e As EventArgs) Handles cbPalette.SelectedIndexChanged
        UpdatePalettePreviewImage()
        SendPreviewIfAuto()
    End Sub

    Private Sub cbPalette_TextChanged(sender As Object, e As EventArgs) Handles cbPalette.TextChanged
        UpdatePalettePreviewImage()
        SendPreviewIfAuto()
    End Sub

    Private Sub UpdatePalettePreviewImage()
        If pbPreviewPalette Is Nothing Then Return

        Dim paletteName As String = cbPalette.Text
        If String.IsNullOrWhiteSpace(paletteName) Then
            pbPreviewPalette.Image = Nothing
            Return
        End If

        ' Find the palette number (ID) for the selected palette
        Dim paletteId As String = ""
        Dim mainForm As FrmMain = TryCast(Application.OpenForms("FrmMain"), FrmMain)
        If mainForm IsNot Nothing Then
            For Each row As DataGridViewRow In mainForm.DG_Paletten.Rows
                If row.IsNewRow Then Continue For
                If String.Equals(CStr(row.Cells("PaletteName").Value), paletteName, StringComparison.OrdinalIgnoreCase) Then
                    paletteId = CStr(row.Cells("PaletteId").Value)
                    Exit For
                End If
            Next
        End If

        If String.IsNullOrWhiteSpace(paletteId) Then
            pbPreviewPalette.Image = Nothing
            Return
        End If

        Dim imagePath As String = System.IO.Path.Combine(My.Settings.PaletteImagesPath, $"PAL_{CInt(paletteId):D2}.gif")
        If System.IO.File.Exists(imagePath) Then
            Try
                ' Dispose previous image to avoid file lock
                If pbPreviewPalette.Image IsNot Nothing Then
                    pbPreviewPalette.Image.Dispose()
                    pbPreviewPalette.Image = Nothing
                End If
                pbPreviewPalette.Image = Image.FromFile(imagePath)
            Catch
                pbPreviewPalette.Image = Nothing
            End Try
        Else
            pbPreviewPalette.Image = Nothing
        End If
    End Sub

    Private Sub cbEffect_SelectedIndexChanged(sender As Object, e As EventArgs) Handles cbEffect.SelectedIndexChanged
        UpdateEffectPreviewImage()
        SendPreviewIfAuto()
    End Sub

    Private Sub cbEffect_TextChanged(sender As Object, e As EventArgs) Handles cbEffect.TextChanged
        UpdateEffectPreviewImage()
        SendPreviewIfAuto()
    End Sub

    Private Sub UpdateEffectPreviewImage()
        If pbPreviewEffect Is Nothing Then Return

        Dim effectName As String = cbEffect.Text
        If String.IsNullOrWhiteSpace(effectName) Then
            pbPreviewEffect.Image = Nothing
            Return
        End If

        ' Find the effect number (ID) for the selected effect
        Dim effectId As String = ""
        Dim mainForm As FrmMain = TryCast(Application.OpenForms("FrmMain"), FrmMain)
        If mainForm IsNot Nothing Then
            For Each row As DataGridViewRow In mainForm.DG_Effecten.Rows
                If row.IsNewRow Then Continue For
                If String.Equals(CStr(row.Cells(0).Value), effectName, StringComparison.OrdinalIgnoreCase) Then
                    effectId = CStr(row.Cells(1).Value)
                    Exit For
                End If
            Next
        End If

        If String.IsNullOrWhiteSpace(effectId) Then
            pbPreviewEffect.Image = Nothing
            Return
        End If

        Dim imagePath As String = System.IO.Path.Combine(My.Settings.EffectsImagePath, $"FX_{CInt(effectId):D3}.gif")
        If System.IO.File.Exists(imagePath) Then
            Try
                If pbPreviewEffect.Image IsNot Nothing Then
                    pbPreviewEffect.Image.Dispose()
                    pbPreviewEffect.Image = Nothing
                End If
                pbPreviewEffect.Image = Image.FromFile(imagePath)
            Catch
                pbPreviewEffect.Image = Nothing
            End Try
        Else
            pbPreviewEffect.Image = Nothing
        End If
    End Sub

    Private Sub tbIntensity_ValueChanged(sender As Object, e As EventArgs) Handles tbIntensity.ValueChanged
        txtIntensity.Text = tbIntensity.Value.ToString()
        SendPreviewIfAuto()
    End Sub

    Private Sub tbSpeed_ValueChanged(sender As Object, e As EventArgs) Handles tbSpeed.ValueChanged
        txtSpeed.Text = tbSpeed.Value.ToString()
        SendPreviewIfAuto()
    End Sub

    Private Sub tbTransition_ValueChanged(sender As Object, e As EventArgs) Handles tbTransition.ValueChanged
        txtTransition.Text = tbTransition.Value.ToString()
        SendPreviewIfAuto()
    End Sub

    Private Sub tbBrightness_ValueChanged(sender As Object, e As EventArgs) Handles tbBrightness.ValueChanged
        txtBrightness.Text = tbBrightness.Value.ToString()
        SendPreviewIfAuto()
    End Sub

    Private Sub txtIntensity_TextChanged(sender As Object, e As EventArgs) Handles txtIntensity.TextChanged
        Dim value As Integer
        If Integer.TryParse(txtIntensity.Text, value) Then
            value = Math.Max(tbIntensity.Minimum, Math.Min(tbIntensity.Maximum, value))
            tbIntensity.Value = value
        End If
    End Sub

    Private Sub txtSpeed_TextChanged(sender As Object, e As EventArgs) Handles txtSpeed.TextChanged
        Dim value As Integer
        If Integer.TryParse(txtSpeed.Text, value) Then
            value = Math.Max(tbSpeed.Minimum, Math.Min(tbSpeed.Maximum, value))
            tbSpeed.Value = value
        End If
    End Sub

    Private Sub txtTransition_TextChanged(sender As Object, e As EventArgs) Handles txtTransition.TextChanged
        Dim value As Integer
        If Integer.TryParse(txtTransition.Text, value) Then
            value = Math.Max(tbTransition.Minimum, Math.Min(tbTransition.Maximum, value))
            tbTransition.Value = value
        End If
    End Sub

    Private Sub txtBrightness_TextChanged(sender As Object, e As EventArgs) Handles txtBrightness.TextChanged
        Dim value As Integer
        If Integer.TryParse(txtBrightness.Text, value) Then
            value = Math.Max(tbBrightness.Minimum, Math.Min(tbBrightness.Maximum, value))
            tbBrightness.Value = value
        End If
    End Sub

    ' Shared buffer for copy/paste functionality
    Private Shared CopiedRowData As New Dictionary(Of String, Object)()

    Private Sub btnCopy_Click(sender As Object, e As EventArgs) Handles btnCopy.Click
        CopiedRowData.Clear()
        CopiedRowData("colEffect") = cbEffect.Text
        CopiedRowData("colPalette") = cbPalette.Text
        CopiedRowData("colStateOnOff") = cbPower.Checked
        CopiedRowData("colSound") = cbSound.Checked
        CopiedRowData("colBlend") = cbBlend.Checked
        CopiedRowData("colBrightness") = tbBrightness.Value
        CopiedRowData("colIntensity") = tbIntensity.Value
        CopiedRowData("colSpeed") = tbSpeed.Value
        CopiedRowData("colTransition") = tbTransition.Value
        CopiedRowData("colColor1") = ColorTranslator.ToHtml(btnColor1.BackColor)
        CopiedRowData("colColor2") = ColorTranslator.ToHtml(btnColor2.BackColor)
        CopiedRowData("colColor3") = ColorTranslator.ToHtml(btnColor3.BackColor)

        ToonFlashBericht("Copied settings to clipboard.", 1)
    End Sub

    Private Sub btnPaste_Click(sender As Object, e As EventArgs) Handles btnPaste.Click
        If CopiedRowData.Count = 0 Then Return

        If CopiedRowData.ContainsKey("colEffect") Then cbEffect.Text = CopiedRowData("colEffect").ToString()
        If CopiedRowData.ContainsKey("colPalette") Then cbPalette.Text = CopiedRowData("colPalette").ToString()
        If CopiedRowData.ContainsKey("colStateOnOff") Then cbPower.Checked = Convert.ToBoolean(CopiedRowData("colStateOnOff"))
        If CopiedRowData.ContainsKey("colSound") Then cbSound.Checked = Convert.ToBoolean(CopiedRowData("colSound"))
        If CopiedRowData.ContainsKey("colBlend") Then cbBlend.Checked = Convert.ToBoolean(CopiedRowData("colBlend"))
        If CopiedRowData.ContainsKey("colBrightness") Then tbBrightness.Value = Convert.ToInt32(CopiedRowData("colBrightness"))
        If CopiedRowData.ContainsKey("colIntensity") Then tbIntensity.Value = Convert.ToInt32(CopiedRowData("colIntensity"))
        If CopiedRowData.ContainsKey("colSpeed") Then tbSpeed.Value = Convert.ToInt32(CopiedRowData("colSpeed"))
        If CopiedRowData.ContainsKey("colTransition") Then tbTransition.Value = Convert.ToInt32(CopiedRowData("colTransition"))
        If CopiedRowData.ContainsKey("colColor1") Then btnColor1.BackColor = ColorTranslator.FromHtml(CopiedRowData("colColor1").ToString())
        If CopiedRowData.ContainsKey("colColor2") Then btnColor2.BackColor = ColorTranslator.FromHtml(CopiedRowData("colColor2").ToString())
        If CopiedRowData.ContainsKey("colColor3") Then btnColor3.BackColor = ColorTranslator.FromHtml(CopiedRowData("colColor3").ToString())
        ToonFlashBericht("Pasted settings from clipboard.", 1)
    End Sub

    ' --- Add these fields to the DetailShowWLED class ---
    Private BankSlots As List(Of BankSlotData) = New List(Of BankSlotData)()
    Private Const BankSlotCount As Integer = 8
    Private ReadOnly Property BankFilePath As String
        Get
            Return Path.Combine(Application.UserAppDataPath, "bankslots.xml")
        End Get
    End Property

    ' --- Call this method after InitializeFieldsFromRowData() in the constructor ----
    Private Sub InitializeBankUI()
        ' Ensure flow panel exists in designer: flpBankSlots
        If flpBankSlots Is Nothing Then Return

        LoadBankFromFile()

        flpBankSlots.Controls.Clear()
        For i As Integer = 1 To BankSlotCount
            Dim slotControl As New BankSlotControl()
            slotControl.SetData(i, If(BankSlots.Count >= i, BankSlots(i - 1), Nothing))
            AddHandler slotControl.SlotClicked, AddressOf BankSlot_Clicked
            flpBankSlots.Controls.Add(slotControl)
        Next

        ' Highlight selected if txtSelectedSlot set
        HighlightSelectedSlot()
    End Sub

    Private Sub LoadBankFromFile()
        Try
            If File.Exists(BankFilePath) Then
                Dim ser As New XmlSerializer(GetType(List(Of BankSlotData)))
                Using fs As New FileStream(BankFilePath, FileMode.Open)
                    BankSlots = CType(ser.Deserialize(fs), List(Of BankSlotData))
                End Using
            End If
        Catch
            BankSlots = New List(Of BankSlotData)()
        End Try

        ' Ensure list has default empty entries
        While BankSlots.Count < BankSlotCount
            BankSlots.Add(New BankSlotData())
        End While
    End Sub

    Private Sub SaveBankToFile()
        Try
            Dim dir = Path.GetDirectoryName(BankFilePath)
            If Not Directory.Exists(dir) Then Directory.CreateDirectory(dir)
            Dim ser As New XmlSerializer(GetType(List(Of BankSlotData)))
            Using fs As New FileStream(BankFilePath, FileMode.Create)
                ser.Serialize(fs, BankSlots)
            End Using
        Catch
            ' ignore persistence errors for now
        End Try
    End Sub

    Private Sub BankSlot_Clicked(sender As BankSlotControl)
        txtSelectedSlot.Text = sender.SlotIndex.ToString()
        HighlightSelectedSlot()
    End Sub

    Private Sub HighlightSelectedSlot()
        Dim selIndex As Integer
        If Integer.TryParse(txtSelectedSlot.Text, selIndex) Then
            For Each c As Control In flpBankSlots.Controls
                Dim b As BankSlotControl = TryCast(c, BankSlotControl)
                If b IsNot Nothing Then
                    b.Highlight(b.SlotIndex = selIndex)
                End If
            Next
        Else
            For Each c As Control In flpBankSlots.Controls
                Dim b As BankSlotControl = TryCast(c, BankSlotControl)
                If b IsNot Nothing Then b.Highlight(False)
            Next
        End If
    End Sub

    ' --- Replace empty btnCopyToBank_Click / btnCopyFromBank_Click bodies with these implementations ---

    Private Sub btnCopyToBank_Click(sender As Object, e As EventArgs) Handles btnCopyToBank.Click
        Dim idx As Integer
        If Not Integer.TryParse(txtSelectedSlot.Text, idx) OrElse idx < 1 OrElse idx > BankSlotCount Then
            ToonFlashBericht("Select a valid bank slot first.", 1)
            Return
        End If

        Dim data As New BankSlotData()
        data.Effect = cbEffect.Text
        data.Palette = cbPalette.Text
        data.StateOnOff = cbPower.Checked
        data.Sound = cbSound.Checked
        data.Blend = cbBlend.Checked
        data.Brightness = tbBrightness.Value
        data.Intensity = tbIntensity.Value
        data.Speed = tbSpeed.Value
        data.Transition = tbTransition.Value
        data.Color1 = ColorTranslator.ToHtml(btnColor1.BackColor)
        data.Color2 = ColorTranslator.ToHtml(btnColor2.BackColor)
        data.Color3 = ColorTranslator.ToHtml(btnColor3.BackColor)

        BankSlots(idx - 1) = data
        SaveBankToFile()

        ' Update visual slot
        Dim slotControl = TryCast(flpBankSlots.Controls(idx - 1), BankSlotControl)
        If slotControl IsNot Nothing Then
            slotControl.SetData(idx, data)
        End If

        ToonFlashBericht($"Saved settings to bank slot {idx}.", 1)
    End Sub

    Private Sub btnCopyFromBank_Click(sender As Object, e As EventArgs) Handles btnCopyFromBank.Click
        Dim idx As Integer
        If Not Integer.TryParse(txtSelectedSlot.Text, idx) OrElse idx < 1 OrElse idx > BankSlotCount Then
            ToonFlashBericht("Select a valid bank slot first.", 1)
            Return
        End If

        Dim data = BankSlots(idx - 1)
        If data Is Nothing Then
            ToonFlashBericht("Selected bank slot is empty.", 1)
            Return
        End If

        ' Restore values to controls
        cbEffect.Text = data.Effect
        cbPalette.Text = data.Palette
        cbPower.Checked = data.StateOnOff
        cbSound.Checked = data.Sound
        cbBlend.Checked = data.Blend
        tbBrightness.Value = Math.Max(tbBrightness.Minimum, Math.Min(tbBrightness.Maximum, data.Brightness))
        tbIntensity.Value = Math.Max(tbIntensity.Minimum, Math.Min(tbIntensity.Maximum, data.Intensity))
        tbSpeed.Value = Math.Max(tbSpeed.Minimum, Math.Min(tbSpeed.Maximum, data.Speed))
        tbTransition.Value = Math.Max(tbTransition.Minimum, Math.Min(tbTransition.Maximum, data.Transition))
        Try
            btnColor1.BackColor = If(String.IsNullOrWhiteSpace(data.Color1), Color.Black, ColorTranslator.FromHtml(data.Color1))
        Catch
        End Try
        Try
            btnColor2.BackColor = If(String.IsNullOrWhiteSpace(data.Color2), Color.Black, ColorTranslator.FromHtml(data.Color2))
        Catch
        End Try
        Try
            btnColor3.BackColor = If(String.IsNullOrWhiteSpace(data.Color3), Color.Black, ColorTranslator.FromHtml(data.Color3))
        Catch
        End Try

        SendPreviewIfAuto()
        ToonFlashBericht($"Loaded settings from bank slot {idx}.", 1)
    End Sub

    Private Async Sub btnRetrieveFromWLED_Click(sender As Object, e As EventArgs) Handles btnRetrieveFromWLED.Click
        Try
            ' Determine selected fixture/segment from the form
            Dim fixtureValue = cbDevice.Text
            If String.IsNullOrWhiteSpace(fixtureValue) Then
                ToonFlashBericht("No device/segment selected.", 1)
                Return
            End If
            If fixtureValue.StartsWith("**") Then
                ToonFlashBericht("Selected fixture is not a WLED device.", 1)
                Return
            End If

            Dim parts = fixtureValue.Split("/"c)
            Dim wledName = parts(0).Trim()
            Dim segmentIndex As Integer = 0
            If parts.Length > 1 Then Integer.TryParse(parts(1), segmentIndex)

            ' Find device row & IP in FrmMain
            Dim devRow As DataGridViewRow = Nothing
            For Each row As DataGridViewRow In FrmMain.DG_Devices.Rows
                If row.IsNewRow Then Continue For
                If String.Equals(Convert.ToString(row.Cells("colInstance").Value), wledName, StringComparison.OrdinalIgnoreCase) Then
                    devRow = row
                    Exit For
                End If
            Next
            If devRow Is Nothing Then
                ToonFlashBericht($"Device '{wledName}' not found in device list.", 1)
                Return
            End If

            Dim wledIp = Convert.ToString(devRow.Cells("colIPAddress").Value)
            If String.IsNullOrWhiteSpace(wledIp) Then
                ToonFlashBericht($"No IP configured for device '{wledName}'.", 1)
                Return
            End If

            ' Request /json from device
            Using client As New Net.Http.HttpClient()
                client.Timeout = TimeSpan.FromSeconds(4)
                Dim resp = Await client.GetAsync($"http://{wledIp}/json")
                If Not resp.IsSuccessStatusCode Then
                    ToonFlashBericht($"Failed to contact WLED at {wledIp} (HTTP {resp.StatusCode}).", 2)
                    Return
                End If
                Dim jsonString = Await resp.Content.ReadAsStringAsync()
                Dim jobj = Newtonsoft.Json.Linq.JObject.Parse(jsonString)

                ' Find segments array
                Dim segArrayToken = jobj.SelectToken("state.seg")
                If segArrayToken Is Nothing Then
                    ToonFlashBericht("WLED returned no segment data.", 2)
                    Return
                End If
                Dim segArray = CType(segArrayToken, Newtonsoft.Json.Linq.JArray)
                If segmentIndex < 0 OrElse segmentIndex >= segArray.Count Then
                    ToonFlashBericht($"Segment index {segmentIndex} invalid for device '{wledName}'.", 1)
                    Return
                End If

                Dim seg = CType(segArray(segmentIndex), Newtonsoft.Json.Linq.JObject)

                ' Effect id -> map to name via DG_Effecten (cell(1) holds id, cell(0) name)
                If seg("fx") IsNot Nothing Then
                    Dim fxId As Integer = seg("fx").ToObject(Of Integer)()
                    Dim effectName As String = ""
                    For Each r As DataGridViewRow In FrmMain.DG_Effecten.Rows
                        If r.IsNewRow Then Continue For
                        If r.Cells.Count > 1 AndAlso r.Cells(1).Value IsNot Nothing AndAlso
                       String.Equals(Convert.ToString(r.Cells(1).Value), fxId.ToString(), StringComparison.OrdinalIgnoreCase) Then
                            effectName = Convert.ToString(r.Cells(0).Value)
                            Exit For
                        End If
                    Next
                    cbEffect.Text = effectName
                End If

                ' Palette id -> map to name via DG_Paletten (cell(1) id, cell(0) name)
                If seg("pal") IsNot Nothing Then
                    Dim palId As Integer = seg("pal").ToObject(Of Integer)()
                    Dim palName As String = ""
                    For Each r As DataGridViewRow In FrmMain.DG_Paletten.Rows
                        If r.IsNewRow Then Continue For
                        If r.Cells.Count > 1 AndAlso r.Cells(1).Value IsNot Nothing AndAlso
                       String.Equals(Convert.ToString(r.Cells(1).Value), palId.ToString(), StringComparison.OrdinalIgnoreCase) Then
                            palName = Convert.ToString(r.Cells(0).Value)
                            Exit For
                        End If
                    Next
                    cbPalette.Text = palName
                End If

                ' Colors (col) - array of [R,G,B] arrays
                If seg("col") IsNot Nothing Then
                    Dim cols = TryCast(seg("col"), Newtonsoft.Json.Linq.JArray)
                    If cols IsNot Nothing Then
                        If cols.Count > 0 AndAlso cols(0) IsNot Nothing AndAlso cols(0).Type = Newtonsoft.Json.Linq.JTokenType.Array Then
                            Dim c0 = cols(0)
                            Try
                                btnColor1.BackColor = Color.FromArgb(c0(0).ToObject(Of Integer)(), c0(1).ToObject(Of Integer)(), c0(2).ToObject(Of Integer)())
                            Catch
                            End Try
                        End If
                        If cols.Count > 1 AndAlso cols(1) IsNot Nothing AndAlso cols(1).Type = Newtonsoft.Json.Linq.JTokenType.Array Then
                            Dim c1 = cols(1)
                            Try
                                btnColor2.BackColor = Color.FromArgb(c1(0).ToObject(Of Integer)(), c1(1).ToObject(Of Integer)(), c1(2).ToObject(Of Integer)())
                            Catch
                            End Try
                        End If
                        If cols.Count > 2 AndAlso cols(2) IsNot Nothing AndAlso cols(2).Type = Newtonsoft.Json.Linq.JTokenType.Array Then
                            Dim c2 = cols(2)
                            Try
                                btnColor3.BackColor = Color.FromArgb(c2(0).ToObject(Of Integer)(), c2(1).ToObject(Of Integer)(), c2(2).ToObject(Of Integer)())
                            Catch
                            End Try
                        End If
                    End If
                End If

                ' Speed (sx), Intensity (ix), Brightness (bri), Transition (transition)
                If seg("sx") IsNot Nothing Then
                    Integer.TryParse(seg("sx").ToString(), tbSpeed.Value)
                End If
                If seg("ix") IsNot Nothing Then
                    Integer.TryParse(seg("ix").ToString(), tbIntensity.Value)
                End If
                If seg("bri") IsNot Nothing Then
                    Integer.TryParse(seg("bri").ToString(), tbBrightness.Value)
                End If
                If seg("transition") IsNot Nothing Then
                    Integer.TryParse(seg("transition").ToString(), tbTransition.Value)
                End If

                ' On/off state (segment or global state)
                Dim onVal As Nullable(Of Boolean) = Nothing
                If seg("on") IsNot Nothing Then
                    onVal = seg("on").ToObject(Of Boolean)()
                ElseIf jobj.SelectToken("state.on") IsNot Nothing Then
                    onVal = jobj.SelectToken("state.on").ToObject(Of Boolean)()
                End If
                If onVal.HasValue Then
                    cbPower.Checked = onVal.Value
                End If

                ' Update preview images (effect/palette thumbnails)
                UpdateEffectPreviewImage()
                UpdatePalettePreviewImage()

                SendPreviewIfAuto()

                ToonFlashBericht("Retrieved settings from device.", 1)
            End Using

        Catch ex As Exception
            ToonFlashBericht($"Error retrieving from WLED: {ex.Message}", 3)
        End Try
    End Sub
End Class
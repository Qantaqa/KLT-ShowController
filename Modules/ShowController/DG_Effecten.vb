Imports System.IO

Module DG_Effecten

    Public Function ValidateLayoutString(layoutString As String) As String
        Dim allowed = "UDLRXY()+-", digits = "0123456789"
        Return String.Concat(layoutString.ToUpper().Where(Function(c) allowed.Contains(c) OrElse digits.Contains(c) OrElse c = ","c))
    End Function

    Public ReadOnly Property MarginLeft As Integer
        Get
            Return 50
        End Get
    End Property
    Public ReadOnly Property MarginTop As Integer
        Get
            Return 20
        End Get
    End Property

    ' *********************************************************************************************
    ' Deze sub werkt de pulldown veld voor effecten, in geval de fixure is gewijzigd
    ' *********************************************************************************************
    Public Sub UpdateEffectenPulldown_ForCurrentFixure(ByVal DG_Show As DataGridView)
        If DG_Show.RowCount = 0 Then
            Exit Sub
        End If
        Dim rowIndex = DG_Show.CurrentRow.Index
        Dim currentRow = DG_Show.Rows(rowIndex)

        Dim effectColumn As DataGridViewComboBoxColumn = TryCast(DG_Show.Columns("colEffect"), DataGridViewComboBoxColumn)
        If effectColumn IsNot Nothing Then
            effectColumn.Items.Clear()
            effectColumn.Items.Add("")

            Dim selectedFixture = currentRow.Cells("colFixture").Value
            If selectedFixture IsNot Nothing Then
                Dim fixtureParts = selectedFixture.ToString().Split("/"c)
                If fixtureParts.Length = 2 Then
                    Dim wledName = fixtureParts(0)
                    ' Zoek de juiste device row in DG_Devices
                    For Each devRow As DataGridViewRow In FrmMain.DG_Devices.Rows
                        If devRow.IsNewRow Then Continue For
                        If Convert.ToString(devRow.Cells("colInstance").Value) = wledName Then
                            Dim effectsJson = Convert.ToString(devRow.Cells("colEffects").Value)
                            If Not String.IsNullOrWhiteSpace(effectsJson) Then
                                Dim effectsList As List(Of String) = Effects_JsonToListOfString(effectsJson)
                                For Each effect In effectsList
                                    effectColumn.Items.Add(effect)
                                Next
                            End If
                            Exit For
                        End If
                    Next
                End If
            End If
        End If
    End Sub


    ' ****************************************************************************************
    '  Behandel de klik op een cel in de effecten DataGridView. 
    ' ****************************************************************************************
    Public Async Sub Handle_DGEffecten_CellContentClick(ByVal sender As Object, ByVal e As DataGridViewCellEventArgs, ByVal DG_Effecten As DataGridView, ByVal DG_Devices As DataGridView)
        If e.RowIndex < 0 Then Exit Sub ' Zorg ervoor dat het geen headerklik is
        If e.ColumnIndex <= 1 Then Exit Sub ' Zorg ervoor dat het niet de eerste kolom is

        Dim currentRow = DG_Effecten.Rows(e.RowIndex)
        Dim effectNaam As String = TryCast(currentRow.Cells("EffectName").Value, String)
        Dim wledNaam As String = TryCast(DG_Effecten.Columns(e.ColumnIndex).Name, String)

        If effectNaam Is Nothing OrElse wledNaam Is Nothing Then
            MessageBox.Show("Ongeldige selectie in de effectenlijst.", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
            Return
        End If

        Dim wledIp = ""

        Debug.WriteLine($"Handle_DGEffecten_CellContentClick: effectNaam = {effectNaam}, wledNaam = {wledNaam}")

        ' Haal het IP-adres op uit DG_Devices
        For Each row As DataGridViewRow In DG_Devices.Rows
            If TryCast(row.Cells("colInstance").Value, String) = wledNaam Then
                wledIp = TryCast(row.Cells("colIPAddress").Value, String)
                Debug.WriteLine($"Handle_DGEffecten_CellContentClick: Found WLED IP = {wledIp}")
                Exit For
            End If
        Next

        If wledIp <> "" Then
            Dim effectId = GetEffectIdFromName(effectNaam, DG_Effecten)
            If effectId <> -1 Then
                Await SendEffectToWLed(wledIp, "1", effectId)
            Else
                MessageBox.Show("Effect niet beschikbaar.", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
            End If
        Else
            MessageBox.Show("WLED IP niet gevonden.", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End If
    End Sub

    ' Public sub to fill DG_Effecten based on availableEffects in DG_Devices.
    ' Effect IDs are retrieved via the WLED API using GetEffectIdFromName_API.

    Public Sub Update_DGEffecten_BasedOnDevices()
        FrmMain.DG_Effecten.Rows.Clear()
        FrmMain.DG_Effecten.Columns.Clear()

        ' Add Effect Name and Effect ID columns
        FrmMain.DG_Effecten.Columns.Add("EffectName", "Effect")
        FrmMain.DG_Effecten.Columns.Add("EffectId", "ID")

        ' Gather all unique effects from all devices
        Dim allEffects As New HashSet(Of String)(StringComparer.OrdinalIgnoreCase)
        Dim deviceNames As New List(Of String)

        For Each devRow As DataGridViewRow In FrmMain.DG_Devices.Rows
            If devRow.IsNewRow Then Continue For
            Dim devName = Convert.ToString(devRow.Cells("colInstance").Value)
            deviceNames.Add(devName)

            Dim effectsJson = Convert.ToString(devRow.Cells("colEffects").Value)
            If String.IsNullOrWhiteSpace(effectsJson) Then Continue For

            Dim effectsList As List(Of String) = Effects_JsonToListOfString(effectsJson)
            For Each eff In effectsList
                allEffects.Add(eff)
            Next
        Next

        ' Add a checkbox column for each device
        For Each devName In deviceNames
            Dim col As New DataGridViewCheckBoxColumn()
            col.Name = devName
            col.HeaderText = devName
            FrmMain.DG_Effecten.Columns.Add(col)
        Next

        ' Fill the grid: one row per effect, with checkboxes for each device
        For Each eff In allEffects
            Dim rowIdx = FrmMain.DG_Effecten.Rows.Add()
            FrmMain.DG_Effecten.Rows(rowIdx).Cells("EffectName").Value = eff
            FrmMain.DG_Effecten.Rows(rowIdx).Cells("EffectId").Value = rowIdx

            ' Set checkboxes for each device
            For Each devName In deviceNames
                Dim devRow = FrmMain.DG_Devices.Rows.Cast(Of DataGridViewRow)().
                FirstOrDefault(Function(r) Not r.IsNewRow AndAlso Convert.ToString(r.Cells("colInstance").Value) = devName)
                If devRow Is Nothing Then Continue For

                Dim effectsJson = Convert.ToString(devRow.Cells("colEffects").Value)
                Dim effectsList As List(Of String) = Effects_JsonToListOfString(effectsJson)
                Dim hasEffect = effectsList.Any(Function(e) String.Equals(e, eff, StringComparison.OrdinalIgnoreCase))
                FrmMain.DG_Effecten.Rows(rowIdx).Cells(devName).Value = hasEffect
            Next
        Next

        ' Sort based on name
        FrmMain.DG_Effecten.Sort(FrmMain.DG_Effecten.Columns("EffectName"), System.ComponentModel.ListSortDirection.Ascending)

    End Sub


    Private Function Effects_JsonToListOfString(effectsJson As String) As List(Of String)
        Try
            Dim cleanJson = effectsJson.Replace(vbCrLf, "").Replace(vbTab, "")
            Return Newtonsoft.Json.JsonConvert.DeserializeObject(Of List(Of String))(cleanJson)
        Catch
            Dim trimmed = effectsJson.Trim("["c, "]"c, " "c, vbCr, vbLf)
            Return trimmed.Split({","}, StringSplitOptions.RemoveEmptyEntries).
            Select(Function(s) s.Trim().Trim(""""c)).ToList()
        End Try
    End Function


    ' *********************************************************
    ' Deze functie haalt de effectnaam op uit de effect ID
    ' *********************************************************
    Public Function GetEffectNameFromId(ByVal effectId As String, ByVal DG_Effects As DataGridView) As String
        ' Zoek de effectnaam in de DG_Effects DataGridView.
        For Each effectRow As DataGridViewRow In DG_Effects.Rows
            Dim effectIdCellValue = effectRow.Cells("EffectId").Value
            Dim effectNameCellValue = effectRow.Cells("EffectName").Value
            If effectIdCellValue IsNot Nothing AndAlso effectIdCellValue.ToString() = effectId Then
                ' Zorg ervoor dat je de juiste datatype vergelijkt.
                If effectNameCellValue IsNot Nothing Then
                    Return effectNameCellValue.ToString()
                Else
                    Return "" ' Of een andere standaardwaarde als de naam null is
                End If
            End If
        Next
        Return "Unknown Effect" ' Retourneer dit als het effect niet wordt gevonden
    End Function

    ' *********************************************************
    ' Deze functie haalt de effectnaam op uit de effect ID
    ' *********************************************************
    Public Function GetEffectIdFromName(ByVal SearchEffectName As String, ByVal DG_Effects As DataGridView) As String
        ' Zoek de effectid in de DG_Effects DataGridView.
        For Each effectRow As DataGridViewRow In DG_Effects.Rows
            Dim effectIdCellValue = effectRow.Cells("EffectId").Value
            Dim effectNameCellValue = effectRow.Cells("EffectName").Value

            If effectNameCellValue IsNot Nothing AndAlso effectNameCellValue.ToString() = SearchEffectName Then
                ' Zorg ervoor dat je de juiste datatype vergelijkt.
                If effectIdCellValue IsNot Nothing Then
                    Return effectIdCellValue.ToString()
                Else
                    Return "" ' Of een andere standaardwaarde als de naam null is
                End If
            End If
        Next
        Return "Unknown Effect" ' Retourneer dit als het effect niet wordt gevonden
    End Function


    ' ****************************************************************************************
    '  Deze functie controleert of de effecten bestaan en toont een vinkje of kruisje in de DataGridView
    ' ****************************************************************************************
    Public Sub TextExistanceEffects(ByVal DG_Effecten As DataGridView, ByVal effectsImagePath As String)
        ' Controleer of de DataGridView geldig is.
        If DG_Effecten Is Nothing Then
            Return
        End If

        ' Voeg de kolom toe als deze nog niet bestaat.
        If DG_Effecten.Columns.Contains("colExists") = False Then
            Dim imageColumn As New DataGridViewImageColumn()
            imageColumn.Name = "colExists"
            imageColumn.HeaderText = "Exists"
            imageColumn.Width = 50
            DG_Effecten.Columns.Add(imageColumn)
        End If

        ' Loop door alle rijen in de DataGridView.
        For Each row As DataGridViewRow In DG_Effecten.Rows
            ' Haal de effectnaam op.
            Dim effectId As String = TryCast(row.Cells("EffectId").Value, String)
            If Not String.IsNullOrEmpty(effectId) Then
                ' Stel het pad naar de image samen.
                Dim imagePath As String = System.IO.Path.Combine(My.Settings.EffectsImagePath, $"FX_{CInt(effectId):D3}.gif")

                ' Controleer of het bestand bestaat.
                If File.Exists(imagePath) Then
                    ' Stel de celwaarde in op een groene vink.
                    row.Cells("colExists").Value = My.Resources.iconGreenBullet1

                Else
                    ' Stel de celwaarde in op een rood kruis.
                    row.Cells("colExists").Value = My.Resources.iconRedBullet1

                End If
            Else
                row.Cells("colExists").Value = DBNull.Value
            End If
        Next
    End Sub

End Module

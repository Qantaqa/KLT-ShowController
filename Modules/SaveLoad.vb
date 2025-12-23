Imports System.IO
Imports System.Runtime
Imports System.Xml
Imports Newtonsoft.Json
Imports Newtonsoft.Json.Linq

Module SaveLoad

    Public Sub SaveDataGridViewToXml(dataGridView As DataGridView, filePath As String)
        Dim settings As New XmlWriterSettings()
        settings.Indent = True
        settings.IndentChars = "    "

        Using writer As XmlWriter = XmlWriter.Create(filePath, settings)
            writer.WriteStartDocument()
            writer.WriteStartElement("DataGridData")

            ' Sla de structuur van de DataGridView op
            writer.WriteStartElement("Structure")
            For Each column As DataGridViewColumn In dataGridView.Columns
                writer.WriteStartElement("Column")
                writer.WriteAttributeString("Name", column.Name.Replace(" ", "_")) ' Vervang spaties door underscores
                writer.WriteAttributeString("Type", column.GetType().ToString())
                ' Voeg lengte toe als attribuut (als van toepassing)
                If TypeOf column Is DataGridViewTextBoxColumn Then
                    Dim textColumn As DataGridViewTextBoxColumn = DirectCast(column, DataGridViewTextBoxColumn)
                    writer.WriteAttributeString("MaxLength", textColumn.MaxInputLength.ToString())
                End If
                ' Voeg AutoSizeMode toe als attribuut
                writer.WriteAttributeString("AutoSizeMode", column.AutoSizeMode.ToString())
                writer.WriteEndElement()
            Next
            writer.WriteEndElement()

            ' Sla de data van de DataGridView op
            writer.WriteStartElement("Data")
            For Each row As DataGridViewRow In dataGridView.Rows
                writer.WriteStartElement("Row")
                For Each cell As DataGridViewCell In row.Cells
                    writer.WriteStartElement(dataGridView.Columns(cell.ColumnIndex).Name.Replace(" ", "_")) ' Vervang spaties door underscores
                    If cell.Value IsNot Nothing Then
                        If (dataGridView.Columns(cell.ColumnIndex).Name = "colDDPData" Or
                            dataGridView.Columns(cell.ColumnIndex).Name = "colAllFrames") AndAlso
                        TypeOf cell.Value Is Byte() Then
                            writer.WriteString(Convert.ToBase64String(CType(cell.Value, Byte())))
                        Else
                            writer.WriteString(cell.Value.ToString())
                        End If
                    Else
                        writer.WriteString("")
                    End If
                    writer.WriteEndElement()
                Next
                writer.WriteEndElement()
            Next
            writer.WriteEndElement()

            writer.WriteEndElement()
            writer.WriteEndDocument()
        End Using
    End Sub




    Public Sub LoadXmlToDataGridView(dataGridView As DataGridView, filePath As String, inclusiveLayout As Boolean)
        If Not File.Exists(filePath) Then
            MessageBox.Show($"Bestand '{filePath}' niet gevonden.", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
            Return
        End If

        Try
            Dim doc As New XmlDocument()
            doc.Load(filePath)

            ' Clear existing data
            dataGridView.Rows.Clear()


            If (inclusiveLayout) Then
                dataGridView.Columns.Clear()
                ' Load the structure of the DataGridView
                Dim structureNode As XmlNode = doc.SelectSingleNode("DataGridData/Structure")
                If structureNode IsNot Nothing Then
                    For Each columnNode As XmlNode In structureNode.ChildNodes
                        Dim columnName As String = columnNode.Attributes("Name").Value
                        Dim columnType As String = columnNode.Attributes("Type").Value

                        ' Create the column based on the type
                        Dim newColumn As DataGridViewColumn = Nothing
                        If columnType = GetType(DataGridViewCheckBoxColumn).ToString() Then
                            Dim checkBoxColumn As New DataGridViewCheckBoxColumn()
                            checkBoxColumn.Name = columnName
                            checkBoxColumn.HeaderText = columnName
                            If columnNode.Attributes("AutoSizeMode") IsNot Nothing Then
                                checkBoxColumn.AutoSizeMode = DirectCast(System.Enum.Parse(GetType(DataGridViewAutoSizeColumnMode), columnNode.Attributes("AutoSizeMode").Value), DataGridViewAutoSizeColumnMode)
                            End If
                            newColumn = checkBoxColumn
                        Else
                            Dim textColumn As New DataGridViewTextBoxColumn()
                            textColumn.Name = columnName
                            textColumn.HeaderText = columnName
                            ' Load MaxLength if available
                            If columnNode.Attributes("MaxLength") IsNot Nothing Then
                                textColumn.MaxInputLength = Integer.Parse(columnNode.Attributes("MaxLength").Value)
                            End If
                            If columnNode.Attributes("AutoSizeMode") IsNot Nothing Then
                                textColumn.AutoSizeMode = DirectCast(System.Enum.Parse(GetType(DataGridViewAutoSizeColumnMode), columnNode.Attributes("AutoSizeMode").Value), DataGridViewAutoSizeColumnMode)
                            End If
                            newColumn = textColumn
                        End If
                        If newColumn IsNot Nothing Then
                            dataGridView.Columns.Add(newColumn)
                        End If
                    Next
                End If
            End If

            ' Load the data of the DataGridView
            Dim dataNode As XmlNode = doc.SelectSingleNode("DataGridData/Data")
            If dataNode IsNot Nothing Then
                For Each rowNode As XmlNode In dataNode.ChildNodes
                    Dim newRowIdx = dataGridView.Rows.Add()
                    Dim newRow = dataGridView.Rows(newRowIdx)
                    For Each cellNode As XmlNode In rowNode.ChildNodes
                        Dim columnName As String = cellNode.Name
                        Dim cellValue As String = cellNode.InnerText

                        If dataGridView.Columns.Contains(columnName) Then
                            If (TypeOf dataGridView.Columns(columnName) Is DataGridViewCheckBoxColumn) Or (cellValue = "True") Or (cellValue = "False") Then
                                Dim boolValue As Boolean
                                If cellValue Is Nothing Or cellValue = "" Then
                                    boolValue = False
                                Else
                                    boolValue = Boolean.Parse(cellValue)
                                End If
                                newRow.Cells(columnName).Value = boolValue
                            ElseIf (TypeOf dataGridView.Columns(columnName) Is DataGridViewImageColumn) Then
                                ' do nothing
                            ElseIf (columnName = "colDDPData" Or columnName = "colAllFrames") Then
                                If Not String.IsNullOrEmpty(cellValue) Then
                                    newRow.Cells(columnName).Value = Convert.FromBase64String(cellValue)
                                Else
                                    newRow.Cells(columnName).Value = Nothing
                                End If
                            Else
                                newRow.Cells(columnName).Value = cellValue
                            End If
                        End If
                    Next
                Next
            End If

        Catch ex As Exception
            MessageBox.Show($"Fout bij het laden van XML: {ex.Message}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End Try
    End Sub







    Public Sub SaveAll()
        Dim Folder As String = My.Settings.DatabaseFolder

        SaveDataGridViewToXml(FrmMain.DG_Devices, Folder + "\Devices.xml")
        SaveDataGridViewToXml(FrmMain.DG_Groups, Folder + "\Groups.xml")

        SaveDataGridViewToXml(FrmMain.DG_Effecten, Folder + "\Effects.xml")
        SaveDataGridViewToXml(FrmMain.DG_Paletten, Folder + "\Paletten.xml")
        SaveDataGridViewToXml(FrmMain.DG_Show, Folder + "\Show.xml")

        SaveDataGridViewToXml(FrmMain.DG_LightSources, Folder + "\Lights.xml")
        SaveDataGridViewToXml(FrmMain.DG_Templates, Folder + "\MyEffects.xml")
        SaveDataGridViewToXml(FrmMain.DG_Frames, Folder + "\Frames.xml")
        SaveDataGridViewToXml(FrmMain.DG_Tracks, Folder + "\Tracks.xml")

        SaveDataGridViewToXml(FrmMain.DG_Actions, Folder + "\Actions.xml")
        SaveDataGridViewToXml(FrmMain.DG_ActionsDetail, Folder + "\ActionsDetail.xml")

        SaveDataGridViewToXml(FrmMain.DG_SoundButtons, Folder + "\SoundButtons.xml")

        ToonFlashBericht("All data has been saved.", 1)

    End Sub

    Public Async Sub LoadAll()
        FrmMain.stageTimer.Enabled = False

        Dim Folder As String = My.Settings.DatabaseFolder


        LoadXmlToDataGridView(FrmMain.DG_Devices, Folder + "\Devices.xml", False)
        LoadXmlToDataGridView(FrmMain.DG_Groups, Folder + "\Groups.xml", False)
        LoadXmlToDataGridView(FrmMain.DG_Effecten, Folder + "\Effects.xml", True)
        LoadXmlToDataGridView(FrmMain.DG_Paletten, Folder + "\Paletten.xml", True)
        LoadXmlToDataGridView(FrmMain.DG_Show, Folder + "\Show.xml", False)

        'SetSegmentsFromGrid(FrmMain.DG_Devices)
        Await SetSegmentsFromGridAsync(FrmMain.DG_Devices)

        LoadXmlToDataGridView(FrmMain.DG_Tracks, Folder + "\Tracks.xml", False)
        LoadXmlToDataGridView(FrmMain.DG_Templates, Folder + "\MyEffects.xml", False)
        'LoadXmlToDataGridView(FrmMain.DG_Frames, Folder + "\Frames.xml", False)
        'LoadXmlToDataGridView(FrmMain.DG_LightSources, Folder + "\Lights.xml", False)

        LoadXmlToDataGridView(FrmMain.DG_Actions, Folder + "\Actions.xml", False)
        LoadXmlToDataGridView(FrmMain.DG_ActionsDetail, Folder + "\ActionsDetail.xml", False)

        LoadXmlToDataGridView(FrmMain.DG_SoundButtons, Folder + "\SoundButtons.xml", False)

        SetAllDevicesOffline(FrmMain.DG_Devices)

        UpdateFixuresPulldown_ForShow(FrmMain.DG_Show)


        If (FrmMain.DG_Show.RowCount > 0) Then
            FrmMain.DG_Show.CurrentCell = FrmMain.DG_Show.Rows(0).Cells(0)
        End If
        UpdateEffectenPulldown_ForCurrentFixure(FrmMain.DG_Show)
        UpdatePalettePulldown_ForCurrentFixure(FrmMain.DG_Show)


        DG_Palette_LoadImages(FrmMain.DG_Paletten)

        CheckWLEDOnlineStatus(FrmMain.DG_Devices)
        PopulateFixtureDropdown_InGroups(FrmMain.DG_Devices, FrmMain.DG_Groups)
        'PopulateTreeView(FrmMain.DG_Groups, FrmMain.tvGroupsSelected)
        GenereerLedLijst(FrmMain.DG_Devices, FrmMain.DG_Groups, FrmMain.pb_Stage, My.Settings.PodiumBreedte, My.Settings.PodiumHoogte)
        TekenPodium(FrmMain.pb_Stage, My.Settings.PodiumBreedte, My.Settings.PodiumHoogte)
        VulEffectCombo()
        FrmMain.stageTimer.Enabled = True

        ToonFlashBericht("Load complete", 2)
    End Sub


    Sub LoadShow()
        Dim Folder As String = My.Settings.DatabaseFolder

        LoadXmlToDataGridView(FrmMain.DG_Show, Folder + "\Show.xml", False)
        UpdateFixuresPulldown_ForShow(FrmMain.DG_Show)
        UpdateEffectenPulldown_ForCurrentFixure(FrmMain.DG_Show)
        UpdatePalettePulldown_ForCurrentFixure(FrmMain.DG_Show)
        'SetSegmentsFromGrid(FrmMain.DG_Devices)
    End Sub


    'Sub LoadEffectPalettes()
    '    Dim Folder As String = My.Settings.DatabaseFolder

    '    LoadXmlToDataGridView(FrmMain.DG_Effecten, Folder + "\Effects.xml", True)
    '    LoadXmlToDataGridView(FrmMain.DG_Paletten, Folder + "\Paletten.xml", True)
    'End Sub


End Module
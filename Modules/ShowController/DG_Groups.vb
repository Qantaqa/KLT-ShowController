' Deze module bevat functionaliteit voor het beheren van LED-groepen.
Module DG_Groups

    '*********************************************************************************************
    '  GroupAddRowAfter
    '  Voegt een nieuwe rij toe aan de DataGridView na de geselecteerde rij.
    '*********************************************************************************************
    Public Sub GroupAddRowAfter(ByVal DG_Groups As DataGridView)
        'Voeg hier de logica toe om een nieuwe rij na de huidige rij toe te voegen
        Dim currentRowIndex As Integer = 0

        If DG_Groups.Rows.Count > 0 Then
            currentRowIndex = DG_Groups.CurrentCell.RowIndex
            DG_Groups.Rows.Insert(currentRowIndex + 1, 1) 'Voegt een nieuwe rij in na de huidige rij
        Else
            DG_Groups.Rows.Insert(0, 1) 'Voegt een nieuwe rij in op de gespecificeerde index
            currentRowIndex = -1
        End If


        'Stel de focus op de nieuwe rij
        DG_Groups.CurrentCell = DG_Groups.Rows(currentRowIndex + 1).Cells(0)

    End Sub

    '*********************************************************************************************
    '  GroupAddRowBefore
    '  Voegt een nieuwe rij toe aan de DataGridView voor de geselecteerde rij.
    '*********************************************************************************************
    Public Sub GroupAddRowBefore(ByVal dgv As DataGridView)
        If dgv.CurrentCell IsNot Nothing Then
            Dim currentIndex = dgv.CurrentCell.RowIndex
            dgv.Rows.Insert(currentIndex, "", "", "", 1, 1, 0) ' Voeg een nieuwe rij in op de huidige index.
        Else
            dgv.Rows.Add("", "", "", 1, 1, 0) ' Voeg een nieuwe rij toe aan het einde als er geen rij is geselecteerd.
        End If
    End Sub

    '*********************************************************************************************
    '  GroupDeleteRow
    '  Verwijdert de geselecteerde rij uit de DataGridView.
    '*********************************************************************************************
    Public Sub GroupDeleteRow(ByVal dgv As DataGridView)
        If dgv.CurrentCell IsNot Nothing Then
            Dim currentIndex = dgv.CurrentCell.RowIndex
            If dgv.Rows.Count > 0 Then
                dgv.Rows.RemoveAt(currentIndex) ' Verwijder de geselecteerde rij.
            End If
        End If
    End Sub

    '*********************************************************************************************
    ' SplitIntoGroups
    ' Splitst de apparaten in groepen op basis van hun lay-out en voegt ze toe aan de groepen DataGridView.
    '*********************************************************************************************
    Public Sub SplitIntoGroups(ByVal dgDevices As DataGridView, ByVal dgGroups As DataGridView)
        PopulateFixtureDropdown_InGroups(dgDevices, dgGroups)

        dgGroups.Rows.Clear()
        Dim globalId As Integer = 1

        For Each devRow As DataGridViewRow In dgDevices.Rows
            If devRow.IsNewRow Then Continue For

            Dim fixtureName = Convert.ToString(devRow.Cells("colInstance").Value)
            Dim rawLayout = Convert.ToString(devRow.Cells("colLayout").Value)
            If String.IsNullOrWhiteSpace(fixtureName) OrElse String.IsNullOrWhiteSpace(rawLayout) Then Continue For

            Dim totalLeds As Integer = 1
            Integer.TryParse(Convert.ToString(devRow.Cells("colLedCount").Value), totalLeds)

            ' Voeg parentgroep toe
            Dim parentId = globalId
            dgGroups.Rows.Add(parentId, 0, fixtureName, fixtureName, Nothing, 1, totalLeds, 0, Nothing, Nothing, False, rawLayout)
            globalId += 1

            ' Herhalingsblokken eerst uitpakken zodat we juiste groepen maken
            Dim expandedLayout As String = ExpandRepeats(rawLayout)

            ' Layout opsplitsen
            Dim segments = ValidateLayoutString(expandedLayout).Split(","c).
            Select(Function(s) s.Trim().ToUpper()).
            Where(Function(s) s.Length > 0).ToList()

            Dim currentStart As Integer = 1
            Dim groupStart As Integer = -1
            Dim groupLayout As New List(Of String)
            Dim orderInFixture As Integer = 1

            ' Laatst bekende X/Y
            Dim lastX As String = Nothing
            Dim lastY As String = Nothing

            For Each seg In segments

                Dim isX = seg.StartsWith("X")
                Dim isY = seg.StartsWith("Y")
                Dim isReset = isX OrElse isY
                Dim num = 0

                If Not isReset Then
                    Integer.TryParse(New String(seg.Where(AddressOf Char.IsDigit).ToArray()), num)
                End If

                If isReset Then
                    ' Sla X/Y op voor later gebruik
                    If isX Then lastX = seg
                    If isY Then lastY = seg

                    ' Sluit actieve groep af
                    If groupStart > 0 AndAlso groupLayout.Count > 0 Then
                        Dim finalLayout = New List(Of String)(groupLayout)
                        ' Injecteer ontbrekende X/Y
                        If Not finalLayout.Any(Function(s) s.StartsWith("X")) AndAlso lastX IsNot Nothing Then finalLayout.Insert(0, lastX)
                        If Not finalLayout.Any(Function(s) s.StartsWith("Y")) AndAlso lastY IsNot Nothing Then
                            Dim insertAt = If(finalLayout.Count > 0 AndAlso finalLayout(0).StartsWith("X"), 1, 0)
                            finalLayout.Insert(insertAt, lastY)
                        End If

                        Dim grpName = $"{fixtureName}-Group{orderInFixture}"

                        dgGroups.Rows.Add(globalId, parentId, grpName, fixtureName, orderInFixture - 1, groupStart, currentStart - 1, orderInFixture, Nothing, Nothing, False, String.Join(",", finalLayout))
                        globalId += 1
                        orderInFixture += 1

                        groupLayout.Clear()
                        groupStart = -1
                    End If

                    groupLayout.Add(seg)
                Else
                    If groupStart < 0 Then groupStart = currentStart
                    groupLayout.Add(seg)
                    currentStart += num
                End If

            Next

            ' Sluit laatste groep
            If groupStart > 0 AndAlso groupLayout.Count > 0 Then
                Dim finalLayout = New List(Of String)(groupLayout)
                If Not finalLayout.Any(Function(s) s.StartsWith("X")) AndAlso lastX IsNot Nothing Then finalLayout.Insert(0, lastX)
                If Not finalLayout.Any(Function(s) s.StartsWith("Y")) AndAlso lastY IsNot Nothing Then
                    Dim insertAt = If(finalLayout.Count > 0 AndAlso finalLayout(0).StartsWith("X"), 1, 0)
                    finalLayout.Insert(insertAt, lastY)
                End If

                Dim grpName = $"{fixtureName}-Group{orderInFixture}"
                dgGroups.Rows.Add(globalId, parentId, grpName, fixtureName, orderInFixture - 1, groupStart, currentStart - 1, orderInFixture, Nothing, Nothing, False, String.Join(",", finalLayout))
                globalId += 1
            End If
        Next
    End Sub

    Private Function ExpandRepeats(layout As String) As String
        Dim pattern As String = "(\d+)\(([^\)]+)\)"
        Dim result As String = layout
        Dim match = System.Text.RegularExpressions.Regex.Match(layout, pattern)

        While match.Success
            Dim count As Integer = Integer.Parse(match.Groups(1).Value)
            Dim content As String = match.Groups(2).Value

            Dim expandedParts As New List(Of String)
            For i As Integer = 1 To count
                expandedParts.Add(content)
            Next

            result = result.Replace(match.Value, String.Join(",", expandedParts))
            match = System.Text.RegularExpressions.Regex.Match(result, pattern)
        End While

        Return result
    End Function





    '*********************************************************************************************
    ' populateFixtureDropdown_InGroups
    ' Vul de fixture dropdown in de groepen DataGridView met unieke fixture-namen.
    '*********************************************************************************************
    Public Sub PopulateFixtureDropdown_InGroups(ByVal dgDevices As DataGridView, ByVal dgGroups As DataGridView)
        ' Verzamelen unieke fixture-namen
        Dim fixtures = dgDevices.Rows.Cast(Of DataGridViewRow)() _
                         .Where(Function(r) Not r.IsNewRow) _
                         .Select(Function(r) Convert.ToString(r.Cells("colInstance").Value)) _
                         .Where(Function(n) Not String.IsNullOrEmpty(n)) _
                         .Distinct() _
                         .ToList()
        ' Zorg dat kolom colGroupFixture een ComboBox-kolom is
        Dim col = TryCast(dgGroups.Columns("colGroupFixture"), DataGridViewComboBoxColumn)
        If col Is Nothing Then
            ' Vervang bestaande kolom door ComboBox             delete old >= assume exists
            Dim idx = dgGroups.Columns("colGroupFixture").Index
            dgGroups.Columns.RemoveAt(idx)
            Dim combo As New DataGridViewComboBoxColumn() With {
                .Name = "colGroupFixture",
                .HeaderText = "Fixture",
                .DataPropertyName = "colGroupFixture",
                .DataSource = fixtures
            }
            dgGroups.Columns.Insert(idx, combo)
        Else
            col.DataSource = fixtures
        End If
    End Sub


    '*********************************************************************************************
    ' PopulateTreeView
    ' Vul de TreeView met groepen op basis van de DataGridView.
    '*********************************************************************************************
    Public Sub PopulateTreeView(ByVal dgGroups As DataGridView, ByVal tvGroups As TreeView)

        tvGroups.BeginUpdate()
        tvGroups.Nodes.Clear()
        ' Dictionary om groupId naar TreeNode te mappen
        Dim nodeMap As New Dictionary(Of Integer, TreeNode)()
        For Each row As DataGridViewRow In dgGroups.Rows
            If row.IsNewRow Then Continue For
            Dim id As Integer = Convert.ToInt32(row.Cells("colGroupId").Value)
            Dim parentId As Integer = Convert.ToInt32(row.Cells("colGroupParentId").Value)
            Dim name As String = Convert.ToString(row.Cells("colGroupName").Value)

            Dim node As New TreeNode(name) With {
                    .Name = id.ToString(),
                    .Tag = id
            }
            nodeMap(id) = node

            ' Voeg toe aan boom
            If parentId = 0 Then
                tvGroups.Nodes.Add(node)
            ElseIf nodeMap.ContainsKey(parentId) Then
                nodeMap(parentId).Nodes.Add(node)
            End If
        Next
        tvGroups.ExpandAll()
        tvGroups.EndUpdate()
    End Sub


    Public Sub PopulateTreeView(tv As TreeView, dgGroups As DataGridView)
        If tv Is Nothing OrElse dgGroups Is Nothing Then Return

        tv.BeginUpdate()
        tv.Nodes.Clear()

        Dim colId = FindColumn(dgGroups, "colGroupId", "GroupId", "Id")
        Dim colParent = FindColumn(dgGroups, "colParentId", "colGroupParentId", "ParentId")
        Dim colName = FindColumn(dgGroups, "colGroupName", "GroupName", "Name")

        ' If we cannot identify an ID column, bail out gracefully
        If colId Is Nothing Then
            tv.Nodes.Add(New TreeNode("(no groups available)"))
            tv.EndUpdate()
            Return
        End If

        ' Build nodes dictionary
        Dim nodesById As New Dictionary(Of Integer, TreeNode)
        Dim parentById As New Dictionary(Of Integer, Integer)

        For Each r As DataGridViewRow In dgGroups.Rows
            If r.IsNewRow Then Continue For
            Dim id = SafeInt(r.Cells(colId.Index).Value, -1)
            If id < 0 Then Continue For

            Dim text As String = If(colName IsNot Nothing, SafeStr(r.Cells(colName.Index).Value), Nothing)
            If String.IsNullOrWhiteSpace(text) Then text = $"Group {id}"

            Dim n As New TreeNode(text) With {.Tag = id.ToString()}
            nodesById(id) = n

            If colParent IsNot Nothing Then
                Dim parentId = SafeInt(r.Cells(colParent.Index).Value, -1)
                If parentId > 0 Then parentById(id) = parentId
            End If
        Next

        ' Attach to parents when possible
        For Each kvp In nodesById
            Dim id = kvp.Key
            Dim node = kvp.Value
            Dim parentId As Integer = -1
            If parentById.TryGetValue(id, parentId) Then
                Dim parentNode As TreeNode = Nothing
                If nodesById.TryGetValue(parentId, parentNode) Then
                    parentNode.Nodes.Add(node)
                    Continue For
                End If
            End If
            ' No parent -> add as root
            tv.Nodes.Add(node)
        Next

        tv.ExpandAll()
        tv.EndUpdate()
    End Sub

    Private Function FindColumn(grid As DataGridView, ParamArray candidates() As String) As DataGridViewColumn
        For Each c In candidates
            If grid.Columns.Contains(c) Then Return grid.Columns(c)
        Next
        For Each col As DataGridViewColumn In grid.Columns
            For Each c In candidates
                If col.Name.IndexOf(c, StringComparison.OrdinalIgnoreCase) >= 0 Then Return col
                If Not String.IsNullOrEmpty(col.HeaderText) AndAlso col.HeaderText.IndexOf(c, StringComparison.OrdinalIgnoreCase) >= 0 Then Return col
            Next
        Next
        Return Nothing
    End Function

    Private Function SafeStr(v As Object) As String
        If v Is Nothing OrElse v Is DBNull.Value Then Return ""
        Return Convert.ToString(v)
    End Function

    Private Function SafeInt(v As Object, defVal As Integer) As Integer
        Try
            If v Is Nothing OrElse v Is DBNull.Value Then Return defVal
            If TypeOf v Is Integer Then Return CInt(v)
            If TypeOf v Is Long Then Return CInt(CLng(v))
            If TypeOf v Is Decimal Then Return CInt(CDec(v))
            If TypeOf v Is Double Then Return CInt(CDbl(v))
            Dim s = Convert.ToString(v)
            Dim n As Integer
            If Integer.TryParse(s, n) Then Return n
        Catch
        End Try
        Return defVal
    End Function
End Module

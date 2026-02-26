Imports System.IO
Imports System.Text.RegularExpressions
Imports System.Windows.Forms.VisualStyles.VisualStyleElement.StartPanel
Imports Microsoft.Web.WebView2.WinForms
Imports Microsoft.Web.WebView2.Core
Imports System.Windows.Forms
Imports System.Drawing

Module ScriptEditor

    Private wired As Boolean = False
    Private hoveredId As Integer = -1
    Private ReadOnly hintTT As New ToolTip() With {.ShowAlways = True, .InitialDelay = 200, .AutoPopDelay = 4000, .ReshowDelay = 200}
    Private mainRef As FrmMain

    ' Drag state
    Private draggingId As Integer = -1
    Private lastDownId As Integer = -1
    Private mouseDownPt As Point
    Private dragMoved As Boolean = False

    ' Hover overlay (non-intrusive)
    Private hoverOverlay As Form
    Private hoverImage As PictureBox
    Private hoverText As Label
    Private hoverDim As Form

    Private Function MainForm() As FrmMain
        If mainRef IsNot Nothing AndAlso Not mainRef.IsDisposed Then Return mainRef
        Try
            For Each f As Form In Application.OpenForms
                Dim fm = TryCast(f, FrmMain)
                If fm IsNot Nothing Then
                    mainRef = fm
                    Return fm
                End If
            Next
        Catch
        End Try
        Return Nothing
    End Function

    Private Sub EnsureHoverOverlay()
        If (hoverOverlay IsNot Nothing AndAlso Not hoverOverlay.IsDisposed) AndAlso (hoverDim IsNot Nothing AndAlso Not hoverDim.IsDisposed) Then Return
        Dim mf = MainForm()
        If mf Is Nothing Then Return

        ' Backdrop (dimmer)
        If hoverDim Is Nothing OrElse hoverDim.IsDisposed Then
            hoverDim = New Form()
            With hoverDim
                .FormBorderStyle = FormBorderStyle.None
                .ShowInTaskbar = False
                .TopMost = True
                .StartPosition = FormStartPosition.Manual
                .BackColor = Color.Black
                .Opacity = 0.4
            End With
            AddHandler hoverDim.MouseMove, Sub() HideHoverOverlay()
            AddHandler hoverDim.Click, Sub() HideHoverOverlay()
        End If

        ' Center content overlay
        If hoverOverlay Is Nothing OrElse hoverOverlay.IsDisposed Then
            hoverOverlay = New Form()
            With hoverOverlay
                .FormBorderStyle = FormBorderStyle.None
                .ShowInTaskbar = False
                .TopMost = True
                .StartPosition = FormStartPosition.Manual
                .BackColor = Color.FromArgb(235, 235, 235)
                .Opacity = 0.95
            End With
            hoverImage = New PictureBox() With {
                .Dock = DockStyle.Top,
                .Height = 1,
                .SizeMode = PictureBoxSizeMode.Zoom,
                .BackColor = Color.Black
            }
            hoverText = New Label() With {
                .Dock = DockStyle.Fill,
                .AutoSize = False,
                .TextAlign = ContentAlignment.TopLeft,
                .Padding = New Padding(12),
                .Font = New Font("Segoe UI", 10.0F, FontStyle.Regular, GraphicsUnit.Point),
                .ForeColor = Color.Black
            }
            hoverOverlay.Controls.Add(hoverText)
            hoverOverlay.Controls.Add(hoverImage)
        End If
    End Sub

    Private Sub ShowHoverOverlay(actionId As Integer)
        Dim mf = MainForm()
        If mf Is Nothing Then Return
        EnsureHoverOverlay()
        If hoverOverlay Is Nothing OrElse hoverDim Is Nothing Then Return

        ' Size and position dimmer to cover main form
        hoverDim.Size = mf.Size
        hoverDim.Location = mf.Location

        ' Determine size around 70% of main form, capped
        Dim w As Integer = Math.Min(mf.ClientSize.Width * 7 \ 10, 1000)
        Dim h As Integer = Math.Min(mf.ClientSize.Height * 7 \ 10, 700)
        If w < 400 Then w = 400
        If h < 300 Then h = 300
        hoverOverlay.Size = New Size(w, h)

        ' Center it over main form
        Dim x As Integer = mf.Left + (mf.Width - w) \ 2
        Dim y As Integer = mf.Top + (mf.Height - h) \ 2
        hoverOverlay.Location = New Point(Math.Max(0, x), Math.Max(0, y))

        ' Load image for this action
        Dim imgPath As String = String.Empty
        Dim idCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionId", "ID", "colID", "colActionID"})
        Dim imageCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionImage", "Image", "colImage"})
        If idCol <> -1 AndAlso imageCol <> -1 Then
            For Each r As DataGridViewRow In mf.DG_Actions.Rows
                If r.IsNewRow Then Continue For
                Dim v = r.Cells(idCol).Value
                Dim n As Integer
                If v IsNot Nothing AndAlso Integer.TryParse(v.ToString(), n) AndAlso n = actionId Then
                    Dim vv = r.Cells(imageCol).Value
                    imgPath = If(vv, String.Empty).ToString()
                    Exit For
                End If
            Next
        End If

        ' Assign image and layout: 70% height for image
        Dim imgHeight = CInt(hoverOverlay.ClientSize.Height * 0.7)
        hoverImage.Height = imgHeight
        If Not String.IsNullOrWhiteSpace(imgPath) AndAlso File.Exists(imgPath) Then
            Try
                Using fs As New FileStream(imgPath, FileMode.Open, FileAccess.Read, FileShare.Read)
                    Using src = Image.FromStream(fs)
                        If hoverImage.Image IsNot Nothing Then hoverImage.Image.Dispose()
                        hoverImage.Image = New Bitmap(src)
                    End Using
                End Using
            Catch
                If hoverImage.Image IsNot Nothing Then hoverImage.Image.Dispose()
                hoverImage.Image = Nothing
            End Try
        Else
            If hoverImage.Image IsNot Nothing Then hoverImage.Image.Dispose()
            hoverImage.Image = Nothing
        End If

        ' Build actions text
        Dim txt = BuildActionsSummary(actionId)
        hoverText.Text = If(String.IsNullOrWhiteSpace(txt), "(Geen acties)", txt)

        If Not hoverDim.Visible Then hoverDim.Show(mf)
        If Not hoverOverlay.Visible Then hoverOverlay.Show(mf)
        mf.Activate() ' keep focus on main form
    End Sub

    Private Sub HideHoverOverlay()
        Try
            If hoverOverlay IsNot Nothing AndAlso Not hoverOverlay.IsDisposed Then hoverOverlay.Hide()
        Catch
        End Try
        Try
            If hoverDim IsNot Nothing AndAlso Not hoverDim.IsDisposed Then hoverDim.Hide()
        Catch
        End Try
    End Sub

    ' Call this once (e.g., after pbPDFViewer is created) to enable PDF annotations
    Public Sub Initialize(Optional form As FrmMain = Nothing)
        Try
            If form IsNot Nothing Then mainRef = form
            Dim mf = MainForm()
            If wired Then Return
            If mf Is Nothing OrElse mf.pbPDFViewer Is Nothing Then Return

            ' Switch to MouseDown/MouseUp to handle drag & click
            AddHandler mf.pbPDFViewer.MouseDown, AddressOf PdfViewer_MouseDown
            AddHandler mf.pbPDFViewer.MouseUp, AddressOf PdfViewer_MouseUp
            AddHandler mf.pbPDFViewer.MouseMove, AddressOf PdfViewer_MouseMove
            AddHandler mf.pbPDFViewer.Paint, AddressOf PdfViewer_Paint

            ' Wire DG_Actions change events
            If mf.DG_Actions IsNot Nothing Then
                AddHandler mf.DG_Actions.RowsAdded, Sub() SafeInvalidatePdf()
                AddHandler mf.DG_Actions.RowsRemoved, Sub() SafeInvalidatePdf()
                AddHandler mf.DG_Actions.CellValueChanged, Sub() SafeInvalidatePdf()
            End If

            wired = True
        Catch
        End Try
    End Sub

    Private Sub SafeInvalidatePdf()
        Try
            Dim mf = MainForm()
            If mf IsNot Nothing AndAlso mf.pbPDFViewer IsNot Nothing Then
                mf.pbPDFViewer.Invalidate()
            End If
        Catch
        End Try
    End Sub

    Private Function IsLocked() As Boolean
        Try
            Dim mf = MainForm()
            If mf Is Nothing OrElse mf.btnLockUnlocked Is Nothing Then Return False
            Return String.Equals(mf.btnLockUnlocked.Text, "Locked", StringComparison.OrdinalIgnoreCase)
        Catch
            Return False
        End Try
    End Function

    Private Sub PdfViewer_MouseDown(sender As Object, e As MouseEventArgs)
        Try
            Dim mf = MainForm()
            If mf Is Nothing Then Return
            lastDownId = -1
            dragMoved = False
            mouseDownPt = e.Location

            Dim id = HitTestActionId(e.X, e.Y)
            If e.Button = MouseButtons.Left Then
                If id > 0 Then
                    lastDownId = id
                    draggingId = id
                Else
                    draggingId = -1
                End If
            ElseIf e.Button = MouseButtons.Right Then
                If id > 0 Then
                    If IsLocked() Then
                        ShowActionDetailReadOnly(id)
                    Else
                        ShowActionOptions(id)
                    End If
                End If
            End If
        Catch
        End Try
    End Sub

    Private Sub PdfViewer_MouseUp(sender As Object, e As MouseEventArgs)
        Try
            Dim mf = MainForm()
            If mf Is Nothing OrElse mf.DG_Actions Is Nothing Then GoTo ResetState
            If mf.currentPage <= 0 Then GoTo ResetState

            If e.Button = MouseButtons.Left Then
                If IsLocked() Then
                    ' Show details read-only if clicking on marker
                    Dim idLocked = HitTestActionId(e.X, e.Y)
                    If idLocked > 0 Then ShowActionDetailReadOnly(idLocked)
                    GoTo ResetState
                End If

                If draggingId > 0 Then
                    If dragMoved Then
                        ' Already updated during move; just finalize
                        GoTo ResetState
                    Else
                        ' Click on existing marker: open options (view/delete)
                        ShowActionOptions(draggingId)
                        GoTo ResetState
                    End If
                Else
                    ' Not on existing marker: create new
                    Dim page As Integer = mf.currentPage
                    Dim x As Integer = e.X
                    Dim y As Integer = e.Y

                    Dim idCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionId", "ID", "colID", "colActionID"})
                    Dim pageCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPage", "Pagenr", "colPagenr", "Page", "colPage"})
                    Dim xCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPosX", "x", "colX"})
                    Dim yCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPosY", "y", "colY"})
                    If idCol = -1 OrElse pageCol = -1 OrElse xCol = -1 OrElse yCol = -1 Then
                        ToonFlashBericht("DG_Actions mist kolommen: ID, Pagenr, x, y.", 6, FlashSeverity.IsError)
                        GoTo ResetState
                    End If

                    Dim nextId As Integer = 1
                    For Each r As DataGridViewRow In mf.DG_Actions.Rows
                        If r.IsNewRow Then Continue For
                        Dim v = r.Cells(idCol).Value
                        Dim n As Integer
                        If v IsNot Nothing AndAlso Integer.TryParse(v.ToString(), n) Then
                            If n >= nextId Then nextId = n + 1
                        End If
                    Next

                    Dim newIdx = mf.DG_Actions.Rows.Add()
                    Dim row = mf.DG_Actions.Rows(newIdx)
                    row.Cells(idCol).Value = nextId
                    row.Cells(pageCol).Value = page
                    row.Cells(xCol).Value = x
                    row.Cells(yCol).Value = y

                    mf.DG_Actions.ClearSelection()
                    row.Selected = True
                    mf.DG_Actions.CurrentCell = row.Cells(idCol)

                    SafeInvalidatePdf()
                    ShowActionDetailPopup(nextId)
                    GoTo ResetState
                End If
            End If

ResetState:
            draggingId = -1
            lastDownId = -1
            dragMoved = False
        Catch
            draggingId = -1
            lastDownId = -1
            dragMoved = False
        End Try
    End Sub

    Private Sub PdfViewer_MouseMove(sender As Object, e As MouseEventArgs)
        Try
            Dim mf = MainForm()
            If mf Is Nothing OrElse mf.pbPDFViewer Is Nothing Then Return

            ' Drag move behavior (unlocked)
            If Not IsLocked() AndAlso draggingId > 0 AndAlso (e.Button And MouseButtons.Left) = MouseButtons.Left Then
                Dim dx = Math.Abs(e.X - mouseDownPt.X)
                Dim dy = Math.Abs(e.Y - mouseDownPt.Y)
                If dx + dy >= 2 Then dragMoved = True

                ' Update the position of the row with this ID on current page
                Dim idCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionId", "ID", "colID", "colActionID"})
                Dim pageCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPage", "Pagenr", "colPagenr", "Page", "colPage"})
                Dim xCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPosX", "x", "colX"})
                Dim yCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPosY", "y", "colY"})
                If idCol <> -1 AndAlso pageCol <> -1 AndAlso xCol <> -1 AndAlso yCol <> -1 Then
                    For Each r As DataGridViewRow In mf.DG_Actions.Rows
                        If r.IsNewRow Then Continue For
                        Dim idObj = r.Cells(idCol).Value
                        Dim id As Integer
                        If idObj Is Nothing OrElse Not Integer.TryParse(idObj.ToString(), id) Then Continue For
                        If id <> draggingId Then Continue For
                        Dim pObj = r.Cells(pageCol).Value
                        Dim p As Integer
                        If pObj Is Nothing OrElse Not Integer.TryParse(pObj.ToString(), p) Then Exit For
                        If p <> mf.currentPage Then Exit For
                        r.Cells(xCol).Value = Math.Max(0, Math.Min(mf.pbPDFViewer.Width - 1, e.X))
                        r.Cells(yCol).Value = Math.Max(0, Math.Min(mf.pbPDFViewer.Height - 1, e.Y))
                        Exit For
                    Next
                    SafeInvalidatePdf()
                End If
                Return
            End If

            ' Hover overlay only when locked
            If Not IsLocked() Then
                If hoveredId <> -1 Then
                    hoveredId = -1
                    HideHoverOverlay()
                    mf.pbPDFViewer.Cursor = Cursors.Default
                End If
                Return
            End If

            Dim hid = HitTestActionId(e.X, e.Y)
            If hid <> hoveredId Then
                hoveredId = hid
                HideHoverOverlay()
                If hid > 0 Then
                    mf.pbPDFViewer.Cursor = Cursors.Hand
                    ShowHoverOverlay(hid)
                Else
                    mf.pbPDFViewer.Cursor = Cursors.Default
                End If
            End If
        Catch
        End Try
    End Sub

    Private Function HitTestActionId(mx As Integer, my As Integer) As Integer
        Try
            Dim mf = MainForm()
            If mf Is Nothing OrElse mf.DG_Actions Is Nothing Then Return -1
            If mf.currentPage <= 0 Then Return -1

            Dim idCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionId", "ID", "colID", "colActionID"})
            Dim pageCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPage", "Pagenr", "colPagenr", "Page", "colPage"})
            Dim xCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPosX", "x", "colX"})
            Dim yCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPosY", "y", "colY"})
            If idCol = -1 OrElse pageCol = -1 OrElse xCol = -1 OrElse yCol = -1 Then Return -1

            For Each r As DataGridViewRow In mf.DG_Actions.Rows
                If r.IsNewRow Then Continue For

                Dim pObj = r.Cells(pageCol).Value
                Dim p As Integer
                If pObj Is Nothing OrElse Not Integer.TryParse(pObj.ToString(), p) Then Continue For
                If p <> mf.currentPage Then Continue For

                Dim xv = r.Cells(xCol).Value
                Dim yv = r.Cells(yCol).Value
                If xv Is Nothing OrElse yv Is Nothing Then Continue For

                Dim px As Integer
                Dim py As Integer
                Integer.TryParse(xv.ToString(), px)
                Integer.TryParse(yv.ToString(), py)

                Dim size As Integer = Math.Max(12, CInt(Math.Min(mf.pbPDFViewer.Width, mf.pbPDFViewer.Height) * 0.03))
                Dim half As Integer = size \ 2
                Dim rect As New Rectangle(px - size, py - half, size, size)
                If rect.Contains(mx, my) Then
                    Dim idObj = r.Cells(idCol).Value
                    Dim id As Integer
                    If idObj IsNot Nothing AndAlso Integer.TryParse(idObj.ToString(), id) Then
                        Return id
                    End If
                End If
            Next
        Catch
        End Try
        Return -1
    End Function

    Private Function BuildActionsSummary(actionId As Integer) As String
        Try
            Dim mf = MainForm()
            If mf Is Nothing OrElse mf.DG_ActionsDetail Is Nothing Then Return String.Empty
            Dim linkCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowID", "ActionRowID", "ActionId", "colActionId"})
            Dim orderCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowOrder", "Order", "colOrder"})
            Dim descrCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowDescr", "Descr", "Description", "colDescr"})
            Dim actorCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowActor", "Actor", "colActor"})
            If linkCol = -1 Then Return String.Empty

            ' Gather rows
            Dim items As New List(Of Tuple(Of Integer, String, String))()
            For Each r As DataGridViewRow In mf.DG_ActionsDetail.Rows
                If r.IsNewRow Then Continue For
                Dim linkObj = r.Cells(linkCol).Value
                Dim id As Integer
                If linkObj Is Nothing OrElse Not Integer.TryParse(linkObj.ToString(), id) Then Continue For
                If id <> actionId Then Continue For
                Dim orderVal As Integer = 0
                If orderCol <> -1 Then
                    Dim ov = r.Cells(orderCol).Value
                    If ov IsNot Nothing Then Integer.TryParse(ov.ToString(), orderVal)
                End If
                Dim descrVal As String = If(If(descrCol <> -1, r.Cells(descrCol).Value, Nothing), String.Empty).ToString()
                Dim actorVal As String = If(If(actorCol <> -1, r.Cells(actorCol).Value, Nothing), String.Empty).ToString()
                items.Add(Tuple.Create(orderVal, descrVal, actorVal))
            Next

            ' Sort by order ascending
            items.Sort(Function(a, b) a.Item1.CompareTo(b.Item1))

            Dim sb As New System.Text.StringBuilder()
            For Each it In items
                Dim line As String = If(it.Item1 > 0, it.Item1 & ". ", "") & it.Item2
                If Not String.IsNullOrWhiteSpace(it.Item3) Then line &= " (" & it.Item3 & ")"
                If sb.Length > 0 Then sb.AppendLine()
                sb.Append(line)
            Next
            Return sb.ToString()
        Catch
            Return String.Empty
        End Try
    End Function

    Private Sub PdfViewer_Paint(sender As Object, e As PaintEventArgs)
        Try
            Dim mf = MainForm()
            If mf Is Nothing OrElse mf.DG_Actions Is Nothing Then Return
            If mf.currentPage <= 0 Then Return

            Dim idCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionId", "ID", "colID", "colActionID"})
            Dim pageCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPage", "Pagenr", "colPagenr", "Page", "colPage"})
            Dim xCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPosX", "x", "colX"})
            Dim yCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionPosY", "y", "colY"})
            If idCol = -1 OrElse pageCol = -1 OrElse xCol = -1 OrElse yCol = -1 Then Return

            For Each r As DataGridViewRow In mf.DG_Actions.Rows
                If r.IsNewRow Then Continue For

                Dim pObj = r.Cells(pageCol).Value
                Dim p As Integer
                If pObj Is Nothing OrElse Not Integer.TryParse(pObj.ToString(), p) Then Continue For
                If p <> mf.currentPage Then Continue For

                Dim xv = r.Cells(xCol).Value
                Dim yv = r.Cells(yCol).Value
                If xv Is Nothing OrElse yv Is Nothing Then Continue For

                Dim px As Integer
                Dim py As Integer
                Integer.TryParse(xv.ToString(), px)
                Integer.TryParse(yv.ToString(), py)

                ' Clamp to control bounds
                px = Math.Max(0, Math.Min(mf.pbPDFViewer.Width - 1, px))
                py = Math.Max(0, Math.Min(mf.pbPDFViewer.Height - 1, py))

                Dim size As Integer = Math.Max(12, CInt(Math.Min(mf.pbPDFViewer.Width, mf.pbPDFViewer.Height) * 0.03))
                Dim labelText As String = If(r.Cells(idCol).Value Is Nothing, "", r.Cells(idCol).Value.ToString())
                DrawLeftTriangleMarker(e.Graphics, px, py, size, labelText)
            Next
        Catch
        End Try
    End Sub

    Private Sub DrawLeftTriangleMarker(g As Graphics, px As Integer, py As Integer, size As Integer, labelText As String)
        Try
            Dim half As Integer = size \ 2
            Dim pts As Point() = {
                New Point(px, py),
                New Point(px - size, py - half),
                New Point(px - size, py + half)
            }
            Using br As New SolidBrush(Color.FromArgb(220, Color.Red)), pen As New Pen(Color.DarkRed, 2)
                g.FillPolygon(br, pts)
                g.DrawPolygon(pen, pts)
            End Using

            If Not String.IsNullOrEmpty(labelText) Then
                Using f As New Font("Segoe UI", Math.Max(8, size \ 2), FontStyle.Bold, GraphicsUnit.Pixel)
                    Dim txtSize = g.MeasureString(labelText, f)
                    Dim tx = px - size - CInt(txtSize.Width) - 6
                    Dim ty = py - CInt(txtSize.Height \ 2)
                    Using brTxt As New SolidBrush(Color.White), brBg As New SolidBrush(Color.FromArgb(200, Color.Black))
                        g.FillRectangle(brBg, New Rectangle(tx - 2, ty - 1, CInt(txtSize.Width + 4), CInt(txtSize.Height + 2)))
                        g.DrawString(labelText, f, brTxt, tx, ty)
                    End Using
                End Using
            End If
        Catch
        End Try
    End Sub

    Private Sub ShowActionDetailPopup(actionId As Integer)
        Try
            Dim mf = MainForm()
            If mf Is Nothing OrElse mf.DG_ActionsDetail Is Nothing Then Return

            ' Locate the DG_Actions row for this action and image column
            Dim idColAct = GetColumnIndex(mf.DG_Actions, New String() {"colActionId", "ID", "colID", "colActionID"})
            Dim imgColAct = GetColumnIndex(mf.DG_Actions, New String() {"colActionImage", "Image", "colImage"})
            Dim actionRow As DataGridViewRow = Nothing
            If idColAct <> -1 AndAlso mf.DG_Actions IsNot Nothing Then
                For Each r As DataGridViewRow In mf.DG_Actions.Rows
                    If r.IsNewRow Then Continue For
                    Dim v = r.Cells(idColAct).Value
                    Dim n As Integer
                    If v IsNot Nothing AndAlso Integer.TryParse(v.ToString(), n) AndAlso n = actionId Then
                        actionRow = r
                        Exit For
                    End If
                Next
            End If

            ' Build a form with actions + image selection
            Dim form As New Form()
            form.Text = "Acties voor ID " & actionId
            form.StartPosition = FormStartPosition.CenterParent
            form.FormBorderStyle = FormBorderStyle.FixedDialog
            form.MinimizeBox = False
            form.MaximizeBox = False
            form.Width = 980
            form.Height = 640

            Dim lbl As New Label() With {.Text = "Voeg acties toe (volgorde, omschrijving, actor)", .AutoSize = True, .Left = 10, .Top = 10}
            Dim grid As New DataGridView() With {
                .Left = 10,
                .Top = 30,
                .Width = CInt(form.ClientSize.Width * 0.4),
                .Height = form.ClientSize.Height - 80,
                .Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Bottom,
                .AllowUserToAddRows = True,
                .AllowUserToDeleteRows = True,
                .AutoGenerateColumns = False
            }

            Dim colOrder As New DataGridViewTextBoxColumn() With {.Name = "colOrder", .HeaderText = "Volgorde", .Width = 80}
            Dim colDescr As New DataGridViewTextBoxColumn() With {.Name = "colDescr", .HeaderText = "Omschrijving", .Width = 280}
            Dim colActor As New DataGridViewTextBoxColumn() With {.Name = "colActor", .HeaderText = "Actor", .Width = 160}
            grid.Columns.AddRange(New DataGridViewColumn() {colOrder, colDescr, colActor})

            ' Start with 1 empty row
            grid.Rows.Add()

            ' Right panel for image
            Dim rightPanel As New Panel() With {
                .Left = grid.Right + 10,
                .Top = 30,
                .Width = form.ClientSize.Width - (grid.Right + 20),
                .Height = form.ClientSize.Height - 80,
                .Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Right Or AnchorStyles.Bottom
            }

            Dim lblImg As New Label() With {.Text = "Afbeelding (per bookmark):", .AutoSize = True, .Left = 0, .Top = 0}
            Dim pb As New PictureBox() With {
                .Left = 0,
                .Top = lblImg.Bottom + 6,
                .Width = rightPanel.Width,
                .Height = rightPanel.Height - 70,
                .Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Right Or AnchorStyles.Bottom,
                .BorderStyle = BorderStyle.FixedSingle,
                .SizeMode = PictureBoxSizeMode.Zoom,
                .BackColor = Color.Black
            }

            ' Load existing image if any
            If actionRow IsNot Nothing AndAlso imgColAct <> -1 Then
                Dim vImg = actionRow.Cells(imgColAct).Value
                Dim path As String = If(vImg, "").ToString()
                If Not String.IsNullOrWhiteSpace(path) AndAlso File.Exists(path) Then
                    Try
                        Using fs As New FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read)
                            Using src = Image.FromStream(fs)
                                pb.Image = New Bitmap(src)
                            End Using
                        End Using
                    Catch
                    End Try
                End If
            End If

            Dim btnChoose As New Button() With {
                .Text = "Afbeelding kiezen...",
                .Left = 0,
                .Top = pb.Bottom + 6,
                .Width = 150,
                .Anchor = AnchorStyles.Bottom Or AnchorStyles.Left
            }
            AddHandler btnChoose.Click, Sub()
                                            If actionRow Is Nothing OrElse imgColAct = -1 Then Return
                                            Using ofd As New OpenFileDialog()
                                                ofd.Title = "Kies een afbeelding"
                                                ofd.Filter = "Afbeeldingen|*.png;*.jpg;*.jpeg;*.bmp;*.gif|Alle bestanden|*.*"
                                                ofd.Multiselect = False
                                                If ofd.ShowDialog(form) = DialogResult.OK Then
                                                    Try
                                                        Dim newPath = ofd.FileName
                                                        Dim oldImg = pb.Image
                                                        If oldImg IsNot Nothing Then oldImg.Dispose()
                                                        Using fs As New FileStream(newPath, FileMode.Open, FileAccess.Read, FileShare.Read)
                                                            Using src = Image.FromStream(fs)
                                                                pb.Image = New Bitmap(src)
                                                            End Using
                                                        End Using
                                                        actionRow.Cells(imgColAct).Value = newPath
                                                    Catch ex As Exception
                                                        Try
                                                            ToonFlashBericht("Kon afbeelding niet laden: " & ex.Message, 6, FlashSeverity.IsError)
                                                        Catch
                                                        End Try
                                                    End Try
                                                End If
                                            End Using
                                        End Sub

            Dim btnRemoveImg As New Button() With {
                .Text = "Afbeelding verwijderen",
                .Left = btnChoose.Right + 8,
                .Top = pb.Bottom + 6,
                .Width = 160,
                .Anchor = AnchorStyles.Bottom Or AnchorStyles.Left
            }
            AddHandler btnRemoveImg.Click, Sub()
                                               If actionRow Is Nothing OrElse imgColAct = -1 Then Return
                                               Dim oldImg = pb.Image
                                               If oldImg IsNot Nothing Then oldImg.Dispose()
                                               pb.Image = Nothing
                                               actionRow.Cells(imgColAct).Value = Nothing
                                           End Sub

            rightPanel.Controls.Add(lblImg)
            rightPanel.Controls.Add(pb)
            rightPanel.Controls.Add(btnChoose)
            rightPanel.Controls.Add(btnRemoveImg)

            ' OK/Cancel
            Dim btnOk As New Button() With {.Text = "OK", .DialogResult = DialogResult.OK, .Left = form.ClientSize.Width - 180, .Top = form.ClientSize.Height - 40, .Width = 80, .Anchor = AnchorStyles.Bottom Or AnchorStyles.Right}
            Dim btnCancel As New Button() With {.Text = "Annuleren", .DialogResult = DialogResult.Cancel, .Left = form.ClientSize.Width - 90, .Top = form.ClientSize.Height - 40, .Width = 80, .Anchor = AnchorStyles.Bottom Or AnchorStyles.Right}

            form.Controls.Add(lbl)
            form.Controls.Add(grid)
            form.Controls.Add(rightPanel)
            form.Controls.Add(btnOk)
            form.Controls.Add(btnCancel)
            form.AcceptButton = btnOk
            form.CancelButton = btnCancel

            If form.ShowDialog(mf) = DialogResult.OK Then
                ' Resolve DG_ActionsDetail columns
                Dim linkCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowID", "ActionRowID", "ActionId", "colActionId"})
                Dim orderCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowOrder", "Order", "colOrder"})
                Dim descrCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowDescr", "Descr", "Description", "colDescr"})
                Dim actorCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowActor", "Actor", "colActor"})
                If linkCol = -1 Then
                    ToonFlashBericht("DG_ActionsDetail mist kolom colActionRowID.", 6, FlashSeverity.IsError)
                    Return
                End If

                Dim seq As Integer = 1
                For Each r As DataGridViewRow In grid.Rows
                    If r.IsNewRow Then Continue For
                    Dim vOrder = r.Cells("colOrder").Value
                    Dim vDescr = r.Cells("colDescr").Value
                    Dim vActor = r.Cells("colActor").Value

                    Dim orderVal As Integer
                    If Integer.TryParse(If(vOrder, "").ToString(), orderVal) Then
                        ' use provided
                    Else
                        orderVal = seq
                    End If
                    Dim descrVal As String = If(vDescr, String.Empty).ToString().Trim()
                    Dim actorVal As String = If(vActor, String.Empty).ToString().Trim()

                    If descrVal.Length = 0 AndAlso actorVal.Length = 0 Then
                        Continue For ' skip empty lines
                    End If

                    Dim idx = mf.DG_ActionsDetail.Rows.Add()
                    Dim dr = mf.DG_ActionsDetail.Rows(idx)
                    dr.Cells(linkCol).Value = actionId
                    If orderCol <> -1 Then dr.Cells(orderCol).Value = orderVal
                    If descrCol <> -1 Then dr.Cells(descrCol).Value = descrVal
                    If actorCol <> -1 Then dr.Cells(actorCol).Value = actorVal

                    seq += 1
                Next
            End If
        Catch
        End Try
    End Sub

    Private Sub ShowActionOptions(actionId As Integer)
        Try
            Dim mf = MainForm()
            If mf Is Nothing OrElse mf.DG_Actions Is Nothing OrElse mf.DG_ActionsDetail Is Nothing Then Return

            ' Zoek de DG_Actions-rij bij dit ID + image kolom
            Dim idCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionId", "ID", "colID", "colActionID"})
            Dim imageCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionImage", "Image", "colImage"})
            Dim actionRow As DataGridViewRow = Nothing
            If idCol <> -1 Then
                For Each r As DataGridViewRow In mf.DG_Actions.Rows
                    If r.IsNewRow Then Continue For
                    Dim v = r.Cells(idCol).Value
                    Dim n As Integer
                    If v IsNot Nothing AndAlso Integer.TryParse(v.ToString(), n) AndAlso n = actionId Then
                        actionRow = r
                        Exit For
                    End If
                Next
            End If

            ' Popup
            Dim form As New Form()
            form.Text = "Bookmark " & actionId & " - Acties"
            form.StartPosition = FormStartPosition.CenterParent
            form.FormBorderStyle = FormBorderStyle.FixedDialog
            form.MinimizeBox = False
            form.MaximizeBox = False
            form.Width = 980
            form.Height = 640

            ' Grid met acties (editable)
            Dim grid As New DataGridView() With {
            .Left = 10,
            .Top = 10,
            .Width = CInt(form.ClientSize.Width * 0.4),
            .Height = form.ClientSize.Height - 70,
            .ReadOnly = False,
            .AllowUserToAddRows = True,
            .AllowUserToDeleteRows = True,
            .Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Bottom,
            .AutoGenerateColumns = False
        }
            Dim cOrder As New DataGridViewTextBoxColumn() With {.Name = "cOrder", .HeaderText = "Volgorde", .Width = 80}
            Dim cDescr As New DataGridViewTextBoxColumn() With {.Name = "cDescr", .HeaderText = "Omschrijving", .AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill}
            Dim cActor As New DataGridViewTextBoxColumn() With {.Name = "cActor", .HeaderText = "Actor", .Width = 160}
            grid.Columns.AddRange(New DataGridViewColumn() {cOrder, cDescr, cActor})

            ' Vul grid met bestaande acties
            Dim linkCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowID", "ActionRowID", "ActionId", "colActionId"})
            Dim orderCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowOrder", "Order", "colOrder"})
            Dim descrCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowDescr", "Descr", "Description", "colDescr"})
            Dim actorCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowActor", "Actor", "colActor"})
            Dim items As New List(Of Tuple(Of Integer, String, String))()
            If linkCol <> -1 Then
                For Each r As DataGridViewRow In mf.DG_ActionsDetail.Rows
                    If r.IsNewRow Then Continue For
                    Dim l = r.Cells(linkCol).Value
                    Dim id As Integer
                    If l Is Nothing OrElse Not Integer.TryParse(l.ToString(), id) Then Continue For
                    If id <> actionId Then Continue For
                    Dim o As Integer = 0
                    If orderCol <> -1 Then
                        Dim ov = r.Cells(orderCol).Value
                        If ov IsNot Nothing Then Integer.TryParse(ov.ToString(), o)
                    End If
                    Dim d As String = If(If(descrCol <> -1, r.Cells(descrCol).Value, Nothing), String.Empty).ToString()
                    Dim a As String = If(If(actorCol <> -1, r.Cells(actorCol).Value, Nothing), String.Empty).ToString()
                    items.Add(Tuple.Create(o, d, a))
                Next
            End If
            items.Sort(Function(a, b) a.Item1.CompareTo(b.Item1))
            For Each it In items
                grid.Rows.Add(it.Item1, it.Item2, it.Item3)
            Next

            ' Rechterpaneel voor afbeelding + knoppen
            Dim rightPanel As New Panel() With {
            .Left = grid.Right + 10,
            .Top = 10,
            .Width = form.ClientSize.Width - (grid.Right + 20),
            .Height = form.ClientSize.Height - 70,
            .Anchor = AnchorStyles.Top Or AnchorStyles.Right Or AnchorStyles.Bottom Or AnchorStyles.Left
        }

            Dim lblImg As New Label() With {
            .Text = "Afbeelding (per bookmark):",
            .AutoSize = True,
            .Left = 0,
            .Top = 0
        }

            Dim pb As New PictureBox() With {
            .Left = 0,
            .Top = lblImg.Bottom + 6,
            .Width = rightPanel.Width,
            .Height = rightPanel.Height - 70,
            .Anchor = AnchorStyles.Top Or AnchorStyles.Left Or AnchorStyles.Right Or AnchorStyles.Bottom,
            .BorderStyle = BorderStyle.FixedSingle,
            .SizeMode = PictureBoxSizeMode.Zoom,
            .BackColor = Color.Black
        }

            ' Laad bestaande afbeelding (indien pad in colActionImage)
            If actionRow IsNot Nothing AndAlso imageCol <> -1 Then
                Dim v = actionRow.Cells(imageCol).Value
                Dim path As String = If(v, "").ToString()
                If Not String.IsNullOrWhiteSpace(path) AndAlso File.Exists(path) Then
                    Try
                        Using fs As New FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read)
                            Using src = Image.FromStream(fs)
                                pb.Image = New Bitmap(src)
                            End Using
                        End Using
                    Catch
                    End Try
                End If
            End If

            Dim btnChoose As New Button() With {
            .Text = "Afbeelding kiezen...",
            .Left = 0,
            .Top = pb.Bottom + 6,
            .Width = 150,
            .Anchor = AnchorStyles.Bottom Or AnchorStyles.Left
        }
            AddHandler btnChoose.Click,
            Sub()
                If actionRow Is Nothing OrElse imageCol = -1 Then Return
                Using ofd As New OpenFileDialog()
                    ofd.Title = "Kies een afbeelding"
                    ofd.Filter = "Afbeeldingen|*.png;*.jpg;*.jpeg;*.bmp;*.gif|Alle bestanden|*.*"
                    ofd.Multiselect = False
                    If ofd.ShowDialog(form) = DialogResult.OK Then
                        Try
                            Dim newPath = ofd.FileName
                            Dim oldImg = pb.Image
                            If oldImg IsNot Nothing Then oldImg.Dispose()
                            Using fs As New FileStream(newPath, FileMode.Open, FileAccess.Read, FileShare.Read)
                                Using src = Image.FromStream(fs)
                                    pb.Image = New Bitmap(src)
                                End Using
                            End Using
                            actionRow.Cells(imageCol).Value = newPath
                        Catch ex As Exception
                            Try
                                ToonFlashBericht("Kon afbeelding niet laden: " & ex.Message, 6, FlashSeverity.IsError)
                            Catch
                            End Try
                        End Try
                    End If
                End Using
            End Sub

            Dim btnRemoveImg As New Button() With {
            .Text = "Afbeelding verwijderen",
            .Left = btnChoose.Right + 8,
            .Top = pb.Bottom + 6,
            .Width = 160,
            .Anchor = AnchorStyles.Bottom Or AnchorStyles.Left
        }
            AddHandler btnRemoveImg.Click,
            Sub()
                If actionRow Is Nothing OrElse imageCol = -1 Then Return
                Dim oldImg = pb.Image
                If oldImg IsNot Nothing Then oldImg.Dispose()
                pb.Image = Nothing
                actionRow.Cells(imageCol).Value = Nothing
            End Sub

            rightPanel.Controls.Add(lblImg)
            rightPanel.Controls.Add(pb)
            rightPanel.Controls.Add(btnChoose)
            rightPanel.Controls.Add(btnRemoveImg)

            ' Onderste knoppen: Delete en OK
            Dim btnDelete As New Button() With {
            .Text = "Verwijder bookmark",
            .Left = form.ClientSize.Width - 320,
            .Top = form.ClientSize.Height - 40,
            .Width = 150,
            .Anchor = AnchorStyles.Bottom Or AnchorStyles.Right
        }
            AddHandler btnDelete.Click,
            Sub()
                If MessageBox.Show(form,
                                   "Weet je zeker dat je deze bookmark en gekoppelde acties wilt verwijderen?",
                                   "Bevestigen",
                                   MessageBoxButtons.YesNo,
                                   MessageBoxIcon.Warning) = DialogResult.Yes Then
                    DeleteAnnotationAndActions(actionId)
                    form.DialogResult = DialogResult.OK
                    form.Close()
                End If
            End Sub

            Dim btnOk As New Button() With {
            .Text = "OK",
            .Left = form.ClientSize.Width - 160,
            .Top = form.ClientSize.Height - 40,
            .Width = 150,
            .DialogResult = DialogResult.OK,
            .Anchor = AnchorStyles.Bottom Or AnchorStyles.Right
        }
            form.AcceptButton = btnOk

            form.Controls.Add(grid)
            form.Controls.Add(rightPanel)
            form.Controls.Add(btnDelete)
            form.Controls.Add(btnOk)

            If form.ShowDialog(mf) = DialogResult.OK Then
                ' Persist edits back to DG_ActionsDetail
                Dim linkCol2 = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowID", "ActionRowID", "ActionId", "colActionId"})
                Dim orderCol2 = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowOrder", "Order", "colOrder"})
                Dim descrCol2 = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowDescr", "Descr", "Description", "colDescr"})
                Dim actorCol2 = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowActor", "Actor", "colActor"})
                If linkCol2 = -1 Then
                    ToonFlashBericht("DG_ActionsDetail mist kolom colActionRowID.", 6, FlashSeverity.IsError)
                    Return
                End If

                ' Remove existing rows for this actionId
                For i = mf.DG_ActionsDetail.Rows.Count - 1 To 0 Step -1
                    Dim rr = mf.DG_ActionsDetail.Rows(i)
                    If rr.IsNewRow Then Continue For
                    Dim l = rr.Cells(linkCol2).Value
                    Dim id As Integer
                    If l IsNot Nothing AndAlso Integer.TryParse(l.ToString(), id) AndAlso id = actionId Then
                        mf.DG_ActionsDetail.Rows.RemoveAt(i)
                    End If
                Next

                ' Add from grid
                Dim seq As Integer = 1
                For Each r As DataGridViewRow In grid.Rows
                    If r.IsNewRow Then Continue For
                    Dim vOrder = r.Cells("cOrder").Value
                    Dim vDescr = r.Cells("cDescr").Value
                    Dim vActor = r.Cells("cActor").Value

                    Dim orderVal As Integer
                    If Integer.TryParse(If(vOrder, "").ToString(), orderVal) Then
                    Else
                        orderVal = seq
                    End If
                    Dim descrVal As String = If(vDescr, String.Empty).ToString().Trim()
                    Dim actorVal As String = If(vActor, String.Empty).ToString().Trim()
                    If descrVal.Length = 0 AndAlso actorVal.Length = 0 Then Continue For

                    Dim idx = mf.DG_ActionsDetail.Rows.Add()
                    Dim dr2 = mf.DG_ActionsDetail.Rows(idx)
                    dr2.Cells(linkCol2).Value = actionId
                    If orderCol2 <> -1 Then dr2.Cells(orderCol2).Value = orderVal
                    If descrCol2 <> -1 Then dr2.Cells(descrCol2).Value = descrVal
                    If actorCol2 <> -1 Then dr2.Cells(actorCol2).Value = actorVal
                    seq += 1
                Next
            End If
        Catch
        End Try
    End Sub

    Private Sub DeleteAnnotationAndActions(actionId As Integer)
        Try
            Dim mf = MainForm()
            If mf Is Nothing Then Return

            Dim idCol = GetColumnIndex(mf.DG_Actions, New String() {"colActionId", "ID", "colID", "colActionID"})
            If idCol <> -1 Then
                For i = mf.DG_Actions.Rows.Count - 1 To 0 Step -1
                    Dim r = mf.DG_Actions.Rows(i)
                    If r.IsNewRow Then Continue For
                    Dim v = r.Cells(idCol).Value
                    Dim id As Integer
                    If v IsNot Nothing AndAlso Integer.TryParse(v.ToString(), id) AndAlso id = actionId Then
                        mf.DG_Actions.Rows.RemoveAt(i)
                        Exit For
                    End If
                Next
            End If

            Dim linkCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowID", "ActionRowID", "ActionId", "colActionId"})
            If linkCol <> -1 Then
                For i = mf.DG_ActionsDetail.Rows.Count - 1 To 0 Step -1
                    Dim r = mf.DG_ActionsDetail.Rows(i)
                    If r.IsNewRow Then Continue For
                    Dim v = r.Cells(linkCol).Value
                    Dim id As Integer
                    If v IsNot Nothing AndAlso Integer.TryParse(v.ToString(), id) AndAlso id = actionId Then
                        mf.DG_ActionsDetail.Rows.RemoveAt(i)
                    End If
                Next
            End If

            SafeInvalidatePdf()
        Catch
        End Try
    End Sub

    Private Sub ShowActionDetailReadOnly(actionId As Integer)
        Try
            Dim mf = MainForm()
            If mf Is Nothing OrElse mf.DG_ActionsDetail Is Nothing Then Return
            Dim linkCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowID", "ActionRowID", "ActionId", "colActionId"})
            Dim orderCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowOrder", "Order", "colOrder"})
            Dim descrCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowDescr", "Descr", "Description", "colDescr"})
            Dim actorCol = GetColumnIndex(mf.DG_ActionsDetail, New String() {"colActionRowActor", "Actor", "colActor"})
            If linkCol = -1 Then Return

            ' Create form
            Dim form As New Form()
            form.Text = "Acties (alleen-lezen) voor ID " & actionId
            form.StartPosition = FormStartPosition.CenterParent
            form.FormBorderStyle = FormBorderStyle.FixedDialog
            form.MinimizeBox = False
            form.MaximizeBox = False
            form.Width = 640
            form.Height = 360

            Dim grid As New DataGridView() With {
                .Dock = DockStyle.Fill,
                .AllowUserToAddRows = False,
                .AllowUserToDeleteRows = False,
                .ReadOnly = True,
                .AutoGenerateColumns = False
            }
            Dim cOrder As New DataGridViewTextBoxColumn() With {.Name = "cOrder", .HeaderText = "Volgorde", .Width = 80}
            Dim cDescr As New DataGridViewTextBoxColumn() With {.Name = "cDescr", .HeaderText = "Omschrijving", .AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill}
            Dim cActor As New DataGridViewTextBoxColumn() With {.Name = "cActor", .HeaderText = "Actor", .Width = 160}
            grid.Columns.AddRange(New DataGridViewColumn() {cOrder, cDescr, cActor})

            ' Collect data
            Dim items As New List(Of Tuple(Of Integer, String, String))()
            For Each r As DataGridViewRow In mf.DG_ActionsDetail.Rows
                If r.IsNewRow Then Continue For
                Dim linkObj = r.Cells(linkCol).Value
                Dim id As Integer
                If linkObj Is Nothing OrElse Not Integer.TryParse(linkObj.ToString(), id) Then Continue For
                If id <> actionId Then Continue For
                Dim orderVal As Integer = 0
                If orderCol <> -1 Then
                    Dim ov = r.Cells(orderCol).Value
                    If ov IsNot Nothing Then Integer.TryParse(ov.ToString(), orderVal)
                End If
                Dim descrVal As String = If(If(descrCol <> -1, r.Cells(descrCol).Value, Nothing), String.Empty).ToString()
                Dim actorVal As String = If(If(actorCol <> -1, r.Cells(actorCol).Value, Nothing), String.Empty).ToString()
                items.Add(Tuple.Create(orderVal, descrVal, actorVal))
            Next
            items.Sort(Function(a, b) a.Item1.CompareTo(b.Item1))

            For Each it In items
                grid.Rows.Add(it.Item1, it.Item2, it.Item3)
            Next

            form.Controls.Add(grid)
            form.ShowDialog(mf)
        Catch
        End Try
    End Sub

    Private Function GetColumnIndex(dgv As DataGridView, candidates As IEnumerable(Of String)) As Integer
        If dgv Is Nothing Then Return -1
        For Each name In candidates
            For Each col As DataGridViewColumn In dgv.Columns
                If String.Equals(col.Name, name, StringComparison.OrdinalIgnoreCase) Then
                    Return col.Index
                End If
            Next
        Next
        Return -1
    End Function

End Module

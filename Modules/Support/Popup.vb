Module Popup

    ' Dictionary to keep track of active notification forms
    Private ActieveMeldingForms As New List(Of Form)

    ' Extra structuur om actieve meldingen en hun count bij te houden
    Private ActiveMessages As New Dictionary(Of String, (Form As Form, Label As Label, Count As Integer, Severity As FlashSeverity))

    Public Enum FlashSeverity
        IsInfo
        IsWarning
        IsError
    End Enum

    Public Sub ToonFlashBericht(ByVal bericht As String, ByVal duurInSeconden As Integer, Optional ByVal severity As FlashSeverity = FlashSeverity.IsInfo)
        Dim key = $"{severity}:{bericht}"

        ' --- Check for existing message ---
        If ActiveMessages.ContainsKey(key) Then
            Dim entry = ActiveMessages(key)
            entry.Count += 1
            ' Update the extra label (small font, parentheses)
            DirectCast(entry.Form.Controls("lblExtra"), Label).Text = $"(Is {entry.Count} keer voorgekomen.)"
            entry.Form.Refresh()
            ActiveMessages(key) = (entry.Form, entry.Label, entry.Count, entry.Severity)
            Return
        End If

        Dim mainScreen = Screen.FromControl(FrmMain)
        Dim screenBounds = mainScreen.WorkingArea
        Dim formWidth As Integer = CInt(screenBounds.Width * 0.33)
        Dim margin As Integer = 20

        Dim meldingForm As New Form()
        meldingForm.Text = ""
        meldingForm.FormBorderStyle = FormBorderStyle.None
        meldingForm.ShowInTaskbar = False
        meldingForm.StartPosition = FormStartPosition.Manual
        meldingForm.Opacity = 0.8
        meldingForm.Padding = New Padding(5)
        meldingForm.Width = formWidth
        meldingForm.TopMost = True

        Select Case severity
            Case FlashSeverity.IsInfo
                meldingForm.BackColor = Color.MidnightBlue
            Case FlashSeverity.IsWarning
                meldingForm.BackColor = Color.DarkOrange
            Case FlashSeverity.IsError
                meldingForm.BackColor = Color.DarkRed
        End Select

        AddHandler meldingForm.Paint, AddressOf MeldingForm_Paint

        ' Main message label
        Dim lblBericht As New Label()
        lblBericht.Text = bericht
        lblBericht.Font = New Font("Segoe UI", 12, FontStyle.Bold)
        lblBericht.ForeColor = Color.White
        lblBericht.BackColor = Color.Transparent
        lblBericht.Location = New Point(10 + meldingForm.Padding.Left, 10 + meldingForm.Padding.Top)
        lblBericht.MaximumSize = New Size(formWidth - 20 - meldingForm.Padding.Horizontal, 0)
        lblBericht.AutoSize = True
        meldingForm.Controls.Add(lblBericht)

        ' Extra label for count (small font, parentheses)
        Dim lblExtra As New Label()
        lblExtra.Name = "lblExtra"
        lblExtra.Text = ""
        lblExtra.Font = New Font("Segoe UI", 8, FontStyle.Italic)
        lblExtra.ForeColor = Color.WhiteSmoke
        lblExtra.BackColor = Color.Transparent
        lblExtra.AutoSize = True
        lblExtra.Location = New Point(lblBericht.Left, lblBericht.Bottom + 2)
        meldingForm.Controls.Add(lblExtra)

        ' Timer label (top right)
        Dim lblTimer As New Label()
        lblTimer.Font = New Font("Segoe UI", 8, FontStyle.Regular)
        lblTimer.ForeColor = Color.WhiteSmoke
        lblTimer.BackColor = Color.Transparent
        lblTimer.AutoSize = True
        lblTimer.TextAlign = ContentAlignment.TopRight
        meldingForm.Controls.Add(lblTimer)

        ' Close button (top right, next to timer)
        Dim btnClose As New Button()
        btnClose.Text = "×"
        btnClose.Font = New Font("Segoe UI", 10, FontStyle.Bold)
        btnClose.Size = New Size(22, 22)
        btnClose.FlatStyle = FlatStyle.Flat
        btnClose.FlatAppearance.BorderSize = 0
        btnClose.BackColor = Color.Transparent
        btnClose.ForeColor = Color.WhiteSmoke
        btnClose.Cursor = Cursors.Hand
        btnClose.TabStop = False
        meldingForm.Controls.Add(btnClose)

        meldingForm.Show()
        meldingForm.Refresh()
        lblBericht.Refresh()
        lblExtra.Refresh()
        meldingForm.ClientSize = New Size(formWidth, lblBericht.Height + lblExtra.Height + 24 + meldingForm.Padding.Vertical)

        lblTimer.Text = $"{duurInSeconden}s"
        lblTimer.Location = New Point(meldingForm.ClientSize.Width - lblTimer.Width - btnClose.Width - 16, 6)
        btnClose.Location = New Point(meldingForm.ClientSize.Width - btnClose.Width - 8, 4)

        ActieveMeldingForms.Add(meldingForm)
        UpdateMeldingPositions()

        ' Timer for auto-close
        Dim tmrVerdwijn As New Timer()
        tmrVerdwijn.Interval = duurInSeconden * 1000
        tmrVerdwijn.Enabled = True
        tmrVerdwijn.Tag = meldingForm
        AddHandler tmrVerdwijn.Tick, AddressOf TimerVerdwijn_Tick

        ' Timer for countdown display
        Dim secondsLeft As Integer = duurInSeconden
        Dim tmrCountdown As New Timer()
        tmrCountdown.Interval = 1000
        tmrCountdown.Enabled = True
        tmrCountdown.Tag = lblTimer
        AddHandler tmrCountdown.Tick,
            Sub(sender As Object, e As EventArgs)
                secondsLeft -= 1
                If secondsLeft > 0 Then
                    lblTimer.Text = $"{secondsLeft}s"
                    lblTimer.Location = New Point(meldingForm.ClientSize.Width - lblTimer.Width - btnClose.Width - 16, 6)
                Else
                    lblTimer.Text = ""
                    tmrCountdown.Stop()
                    tmrCountdown.Dispose()
                End If
            End Sub

        ' Close button handler
        AddHandler btnClose.Click,
            Sub(sender As Object, e As EventArgs)
                If ActieveMeldingForms.Contains(meldingForm) Then
                    ActieveMeldingForms.Remove(meldingForm)
                    UpdateMeldingPositions()
                End If
                If ActiveMessages.ContainsKey(key) Then
                    ActiveMessages.Remove(key)
                End If
                tmrVerdwijn.Stop()
                tmrVerdwijn.Dispose()
                tmrCountdown.Stop()
                tmrCountdown.Dispose()
                meldingForm.Close()
                meldingForm.Dispose()
            End Sub

        ' Verwijder uit dictionary als timer afloopt
        AddHandler tmrVerdwijn.Tick,
            Sub(sender As Object, e As EventArgs)
                If ActiveMessages.ContainsKey(key) Then
                    ActiveMessages.Remove(key)
                End If
            End Sub

        ' Voeg toe aan dictionary
        ActiveMessages(key) = (meldingForm, lblBericht, 1, severity)
    End Sub

    ' Update positions of all active notification forms
    Private Sub UpdateMeldingPositions()
        Dim mainScreen = Screen.FromControl(FrmMain)
        Dim screenBounds = mainScreen.WorkingArea
        Dim margin = 20
        Dim totalHeight = 0

        ' Position from bottom up
        For i = ActieveMeldingForms.Count - 1 To 0 Step -1
            Dim frm = ActieveMeldingForms(i)
            Dim frmHeight = frm.Height
            frm.Location = New Point(
                screenBounds.Right - frm.Width - margin,
                screenBounds.Bottom - frmHeight - margin - totalHeight
            )
            totalHeight += frmHeight + 8 ' 8px gap between messages
        Next
    End Sub

    Private Sub MeldingForm_Paint(sender As Object, pe As PaintEventArgs)
        Dim frm As Form = DirectCast(sender, Form)
        Dim g As Graphics = pe.Graphics
        Dim rect As Rectangle = frm.ClientRectangle
        rect.Inflate(-frm.Padding.All, -frm.Padding.All)
        ' Optional: draw border if desired
        'g.DrawRectangle(Pens.White, rect)
    End Sub

    Private Sub TimerVerdwijn_Tick(sender As Object, e As EventArgs)
        Dim timer As Timer = DirectCast(sender, Timer)
        Dim frm As Form = TryCast(timer.Tag, Form)

        If frm IsNot Nothing Then
            ActieveMeldingForms.Remove(frm)
            UpdateMeldingPositions()
            timer.Stop()
            timer.Dispose()
            frm.Close()
            frm.Dispose()
        End If
    End Sub


End Module
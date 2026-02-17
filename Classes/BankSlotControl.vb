Public Class BankSlotControl
    Inherits UserControl

    Public Property SlotIndex As Integer

    Private lblIndex As Label
    Private lblEffect As Label
    Private lblPalette As Label
    Private pColor1 As Panel
    Private pColor2 As Panel
    Private pColor3 As Panel

    Public Sub New()
        Me.Size = New Size(200, 60)
        Me.BorderStyle = BorderStyle.FixedSingle
        Me.BackColor = Color.Black

        lblIndex = New Label() With {
            .Location = New Point(4, 4),
            .Size = New Size(28, 18),
            .TextAlign = ContentAlignment.MiddleCenter,
            .Font = New Font("Segoe UI", 8.0F),
            .ForeColor = SystemColors.ActiveCaption,
            .BackColor = Color.Black
        }
        lblEffect = New Label() With {
            .Location = New Point(36, 2),
            .Size = New Size(156, 18),
            .Font = New Font("Segoe UI", 8.0F),
            .ForeColor = SystemColors.ActiveCaption,
            .BackColor = Color.Black
        }
        lblPalette = New Label() With {
            .Location = New Point(36, 20),
            .Size = New Size(156, 18),
            .Font = New Font("Segoe UI", 8.0F),
            .ForeColor = SystemColors.ActiveCaption,
            .BackColor = Color.Black
        }

        pColor1 = New Panel() With {.Location = New Point(36, 38), .Size = New Size(28, 18), .BorderStyle = BorderStyle.FixedSingle}
        pColor2 = New Panel() With {.Location = New Point(66, 38), .Size = New Size(28, 18), .BorderStyle = BorderStyle.FixedSingle}
        pColor3 = New Panel() With {.Location = New Point(96, 38), .Size = New Size(28, 18), .BorderStyle = BorderStyle.FixedSingle}

        Me.Controls.Add(lblIndex)
        Me.Controls.Add(lblEffect)
        Me.Controls.Add(lblPalette)
        Me.Controls.Add(pColor1)
        Me.Controls.Add(pColor2)
        Me.Controls.Add(pColor3)

        ' forward clicks of children to the control click
        For Each c As Control In Me.Controls
            AddHandler c.Click, AddressOf Child_Click
        Next
        AddHandler Me.Click, AddressOf Child_Click
    End Sub

    Private Sub Child_Click(sender As Object, e As EventArgs)
        RaiseEvent SlotClicked(Me)
    End Sub

    Public Event SlotClicked(ByVal sender As BankSlotControl)

    Public Sub SetData(index As Integer, data As BankSlotData)
        Me.SlotIndex = index
        lblIndex.Text = index.ToString()
        ' ensure label colours remain correct after updates
        lblIndex.ForeColor = SystemColors.ActiveCaption
        lblIndex.BackColor = Color.Black
        lblEffect.ForeColor = SystemColors.ActiveCaption
        lblEffect.BackColor = Color.Black
        lblPalette.ForeColor = SystemColors.ActiveCaption
        lblPalette.BackColor = Color.Black

        If data Is Nothing Then
            lblEffect.Text = ""
            lblPalette.Text = ""
            pColor1.BackColor = Color.Black
            pColor2.BackColor = Color.Black
            pColor3.BackColor = Color.Black
        Else
            lblEffect.Text = If(data.Effect, "")
            lblPalette.Text = If(data.Palette, "")
            Try
                pColor1.BackColor = If(String.IsNullOrWhiteSpace(data.Color1), Color.Black, ColorTranslator.FromHtml(data.Color1))
            Catch
                pColor1.BackColor = Color.Black
            End Try
            Try
                pColor2.BackColor = If(String.IsNullOrWhiteSpace(data.Color2), Color.Black, ColorTranslator.FromHtml(data.Color2))
            Catch
                pColor2.BackColor = Color.Black
            End Try
            Try
                pColor3.BackColor = If(String.IsNullOrWhiteSpace(data.Color3), Color.Black, ColorTranslator.FromHtml(data.Color3))
            Catch
                pColor3.BackColor = Color.Black
            End Try
        End If
    End Sub

    Public Sub Highlight(selected As Boolean)
        If selected Then
            ' subtle highlight while keeping dark background
            Me.BackColor = Color.FromArgb(24, 36, 64) ' dark bluish
            ' keep labels readable
            lblIndex.ForeColor = SystemColors.ActiveCaption
            lblEffect.ForeColor = SystemColors.ActiveCaption
            lblPalette.ForeColor = SystemColors.ActiveCaption
        Else
            Me.BackColor = Color.Black
            lblIndex.ForeColor = SystemColors.ActiveCaption
            lblEffect.ForeColor = SystemColors.ActiveCaption
            lblPalette.ForeColor = SystemColors.ActiveCaption
        End If
    End Sub
End Class

Public Class BankSlotData
    Public Property Effect As String
    Public Property Palette As String
    Public Property Color1 As String
    Public Property Color2 As String
    Public Property Color3 As String
    Public Property StateOnOff As Boolean
    Public Property Sound As Boolean
    Public Property Blend As Boolean
    Public Property Brightness As Integer
    Public Property Intensity As Integer
    Public Property Speed As Integer
    Public Property Transition As Integer

    Public Sub New()
    End Sub
End Class
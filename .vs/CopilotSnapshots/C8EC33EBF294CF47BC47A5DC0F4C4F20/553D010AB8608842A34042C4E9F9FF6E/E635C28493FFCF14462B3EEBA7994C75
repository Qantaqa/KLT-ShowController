Imports System.IO
Imports System.Net
Imports System.Net.Http
Imports System.Security.AccessControl
Imports System.Text
Imports System.Text.RegularExpressions
Imports System.Windows.Forms.AxHost
Imports Newtonsoft.Json.Linq
Imports System.Drawing
Imports System.Drawing.Imaging
Imports System.Runtime.InteropServices
Imports AxWMPLib
Imports WMPLib ' Nodig voor Import



Module DG_Show
    Dim booleanBlinkStart As Boolean = True
    Dim booleanBlinkNextEvent As Boolean = False
    Dim booleanBlinkNextScene As Boolean = False
    Dim booleanBlinkTimer As Boolean = False
    Dim booleanBlinkStop As Boolean = False
    Dim booleanBlinkStopLooping As Boolean = False
    Dim booleanBlinkNextAct As Boolean = False

    Dim colorBlinkTimer As Color = Color.Green

    ' Variabelen voor het afspelen van GIF-afbeeldingen
    Private gifImage As Image
    Private currentFrame As Integer
    Private frameTimer As Timer
    Private frameDelayList() As Integer ' Array om de frame delays op te slaan



    Public Class WledSegmentData
        Public Property id As Integer
        Public Property fx As String
    End Class



    Public Sub TurnOnBlinkOfStopLooping()
        booleanBlinkStopLooping = True
    End Sub

    ' *********************************************************
    ' Deze sub werkt het fixure pulldown veld bij, met beschikbare fixured
    ' *********************************************************
    Public Sub UpdateFixuresPulldown_ForShow(ByVal DG_Show As DataGridView)
        Dim currentRow As DataGridViewRow
        If (DG_Show.RowCount = 0) Or IsNothing(DG_Show.CurrentRow) Then
            ' No show loaded yet, nothing to update
            Return
        Else
            currentRow = DG_Show.Rows(DG_Show.CurrentRow.Index)
        End If

        Dim fixtureColumn As DataGridViewComboBoxColumn = TryCast(DG_Show.Columns("colFixture"), DataGridViewComboBoxColumn)
        If fixtureColumn IsNot Nothing Then
            ' Clear de vorige items
            fixtureColumn.Items.Clear()

            fixtureColumn.Items.Add("** Video **/ Primairy")
            fixtureColumn.Items.Add("** Video **/ Secondairy")


            ' Voeg de WLED devices en segmenten toe aan de dropdown list
            For Each devRow As DataGridViewRow In FrmMain.DG_Devices.Rows
                If devRow.IsNewRow Then Continue For

                Dim wledName As String = Convert.ToString(devRow.Cells("colInstance").Value)
                Dim segmentsValue As String = Convert.ToString(devRow.Cells("colSegments").Value)

                If Not String.IsNullOrWhiteSpace(wledName) AndAlso Not String.IsNullOrWhiteSpace(segmentsValue) Then
                    ' Zoek alle segmenten in de vorm (start-end)
                    Dim matches = System.Text.RegularExpressions.Regex.Matches(segmentsValue, "\([^\)]+\)")
                    For i As Integer = 0 To matches.Count - 1
                        fixtureColumn.Items.Add($"{wledName}/{i}")
                    Next
                End If
            Next
        End If
    End Sub


    ' *********************************************************************************************
    ' Deze sub werkt de overige waarden bij met default waarden van de wled, in geval de fixure is gewijzigd
    ' *********************************************************************************************
    ' *********************************************************************************************
    ' Deze sub werkt de overige waarden bij met default waarden van de wled, in geval de fixure is gewijzigd
    ' *********************************************************************************************
    Public Sub UpdateOtherFields_ForCurrentFixure(ByVal DG_Show As DataGridView, RowIndex As Integer)
        Dim currentRow = DG_Show.Rows(RowIndex)

        Dim selectedFixture = currentRow.Cells("colFixture").Value
        If (selectedFixture IsNot Nothing) Then
            If ((selectedFixture <> "") AndAlso Not (selectedFixture.StartsWith("**", StringComparison.Ordinal))) Then
                Dim fixtureParts = selectedFixture.ToString().Split("/"c)
                If fixtureParts.Length = 2 Then
                    Dim wledName = fixtureParts(0)
                    Dim segmentIndex = Integer.Parse(fixtureParts(1))

                    ' Zoek de juiste device row in DG_Devices
                    Dim devRow As DataGridViewRow = Nothing
                    For Each row As DataGridViewRow In FrmMain.DG_Devices.Rows
                        If row.IsNewRow Then Continue For
                        If Convert.ToString(row.Cells("colInstance").Value) = wledName Then
                            devRow = row
                            Exit For
                        End If
                    Next

                    If devRow IsNot Nothing Then
                        ' Aan/uit moet altijd dan naar aan
                        currentRow.Cells("colStateOnOff").Value = True

                        ' Verwacht een JSON string met segmentdata in colSegmentsData
                        Dim segmentsJson As String = TryCast(devRow.Cells("colSegmentsData").Value, String)
                        If Not String.IsNullOrWhiteSpace(segmentsJson) Then
                            Try
                                Dim segments = Newtonsoft.Json.JsonConvert.DeserializeObject(Of JArray)(segmentsJson)
                                If segments IsNot Nothing AndAlso segments.Count > segmentIndex Then
                                    Dim segment = TryCast(segments(segmentIndex), JObject)

                                    ' Speed
                                    If segment("sx") IsNot Nothing Then
                                        currentRow.Cells("colSpeed").Value = segment("sx").Value(Of Integer)
                                    End If

                                    ' Intensity
                                    If segment("ix") IsNot Nothing Then
                                        currentRow.Cells("colIntensity").Value = segment("ix").Value(Of Integer)
                                    End If

                                    ' Huidige effect en palette waarde
                                    If segment("fx") IsNot Nothing Then
                                        currentRow.Cells("colEffectId").Value = segment("fx").ToString()
                                    End If
                                    If segment("pal") IsNot Nothing Then
                                        currentRow.Cells("colPaletteId").Value = segment("pal").ToString()
                                    End If

                                    ' Kleur 1 2 en 3 van wled
                                    Dim colors = TryCast(segment("col"), JArray)
                                    If colors IsNot Nothing Then
                                        If colors.Count > 0 Then
                                            currentRow.Cells("colColor1").Value = ColorTranslator.ToOle(Color.FromArgb(colors(0)(0).Value(Of Integer), colors(0)(1).Value(Of Integer), colors(0)(2).Value(Of Integer)))
                                        End If
                                        If colors.Count > 1 Then
                                            currentRow.Cells("colColor2").Value = ColorTranslator.ToOle(Color.FromArgb(colors(1)(0).Value(Of Integer), colors(1)(1).Value(Of Integer), colors(1)(2).Value(Of Integer)))
                                        End If
                                        If colors.Count > 2 Then
                                            currentRow.Cells("colColor3").Value = ColorTranslator.ToOle(Color.FromArgb(colors(2)(0).Value(Of Integer), colors(2)(1).Value(Of Integer), colors(2)(2).Value(Of Integer)))
                                        End If
                                    End If

                                    ' Brightness van wled
                                    If segment("bri") IsNot Nothing Then
                                        currentRow.Cells("colBrightness").Value = segment("bri").Value(Of Integer)
                                    End If

                                    ' Overgang (transition) van wled
                                    If segment("transition") IsNot Nothing Then
                                        currentRow.Cells("colTransition").Value = segment("transition").Value(Of Integer)
                                    Else
                                        currentRow.Cells("colTransition").Value = 0 ' or some default value
                                    End If

                                    ' Geluid standaard uit
                                    currentRow.Cells("colSound").Value = False
                                End If
                            Catch ex As Exception
                                ' Foutafhandling: JSON niet goed of segment ontbreekt
                                currentRow.Cells("colSpeed").Value = 0
                                currentRow.Cells("colIntensity").Value = 0
                                currentRow.Cells("colEffectId").Value = ""
                                currentRow.Cells("colPaletteId").Value = ""
                                currentRow.Cells("colColor1").Value = 0
                                currentRow.Cells("colColor2").Value = 0
                                currentRow.Cells("colColor3").Value = 0
                                currentRow.Cells("colBrightness").Value = 0
                                currentRow.Cells("colTransition").Value = 0
                                currentRow.Cells("colSound").Value = False
                            End Try
                        End If
                    End If
                End If
            End If
        End If
    End Sub



    ' *********************************************************
    ' Als het filter veld is gewijzigd, filter de Show grid op basis van de geselecteerde Act
    ' *********************************************************
    Public Sub FilterDG_Show(ByVal DG_Show As DataGridView, ByVal filterAct As ToolStripComboBox)
        On Error Resume Next

        Dim filterValue As String = filterAct.SelectedItem?.ToString()

        If String.IsNullOrEmpty(filterValue) Then
            ' Toon alle rijen als het filter leeg is
            For Each row As DataGridViewRow In DG_Show.Rows
                row.Visible = True
            Next
        Else
            ' Filter de rijen op basis van de geselecteerde Act
            For Each row As DataGridViewRow In DG_Show.Rows
                If row.Cells("colAct").Value?.ToString() = filterValue Then
                    row.Visible = True
                Else
                    row.Visible = False
                End If
            Next
        End If
    End Sub


    ' *********************************************************
    ' Add Row BEFORE
    ' *********************************************************
    Public Sub DG_Show_AddNewRowBefore_Click(ByVal DG_Show As DataGridView)

        'Voeg hier de logica toe om een nieuwe rij voor de huidige rij toe te voegen
        Dim currentRowIndex As Integer = 0
        If DG_Show.Rows.Count > 0 Then
            currentRowIndex = DG_Show.CurrentCell.RowIndex
        End If
        DG_Show.Rows.Insert(currentRowIndex, 1) 'Voegt een nieuwe rij in op de gespecifieerde index

        'Stel de focus op de nieuwe rij
        DG_Show.CurrentCell = DG_Show.Rows(currentRowIndex).Cells(0)

        ' Vul het pulldown veld voor de fixture
        UpdateFixuresPulldown_ForShow(DG_Show)

    End Sub

    ' *********************************************************
    ' Add Row AFTER
    ' *********************************************************
    Public Sub DG_Show_AddNewRowAfter_Click(ByVal DG_Show As DataGridView)
        'Voeg hier de logica toe om een nieuwe rij na de huidige rij toe te voegen
        Dim currentRowIndex As Integer = 0

        If DG_Show.Rows.Count > 0 Then
            If IsNothing(DG_Show.CurrentCell) Then
                Return
            End If
            currentRowIndex = DG_Show.CurrentCell.RowIndex
            DG_Show.Rows.Insert(currentRowIndex + 1, 1) 'Voegt een nieuwe rij in na de huidige rij
        Else
            DG_Show.Rows.Insert(0, 1) 'Voegt een nieuwe rij in op de gespecifieerde index
            currentRowIndex = -1
        End If


        'Stel de focus op de nieuwe rij
        DG_Show.CurrentCell = DG_Show.Rows(currentRowIndex + 1).Cells(0)

        UpdateFixuresPulldown_ForShow(DG_Show)


    End Sub

    ' *********************************************************
    ' REMOVE Row
    ' *********************************************************
    Public Sub DG_Show_RemoveCurrentRow_Click(ByVal DG_Show As DataGridView)

        'Voeg hier de logica toe om de huidige rij te verwijderen
        Dim currentRowIndex As Integer = DG_Show.CurrentCell.RowIndex
        If DG_Show.Rows.Count > 0 Then
            DG_Show.Rows.RemoveAt(currentRowIndex)
        End If
    End Sub


    ' *********************************************************
    ' Deze sub werkt de effect en palette naam bij, in geval het ID van effect of palette is gewijzigd
    ' *********************************************************
    Public Sub AfterUpdateEffectOrPaletteId_UpdateEffectAndPaletteName(ByVal DG_Show As DataGridView, ByVal DG_Effects As DataGridView, ByVal DG_Palette As DataGridView)
        For Each row As DataGridViewRow In DG_Show.Rows
            Dim effectIdCell As DataGridViewCell = row.Cells("colEffectId")
            Dim effectNameCell As DataGridViewCell = row.Cells("colEffect")
            Dim paletteIdCell As DataGridViewCell = row.Cells("colPaletteId")
            Dim paletteNameCell As DataGridViewCell = row.Cells("colPalette")


            If effectIdCell.Value IsNot Nothing Then
                Dim effectId As String = effectIdCell.Value.ToString()
                Dim effectName As String = GetEffectNameFromId(effectId, DG_Effects)  ' Roep de functie aan om de naam op te halen
                effectNameCell.Value = effectName
            End If

            If paletteIdCell.Value IsNot Nothing Then
                Dim paletteId As String = paletteIdCell.Value.ToString()
                Dim paletteName As String = GetPaletteNameFromId(paletteId, DG_Palette)
                paletteNameCell.Value = paletteName
            End If
        Next
    End Sub

    ' *********************************************************
    ' Deze sub werkt de kleurvelden bij met een kleurenwiel
    ' *********************************************************
    Public Function GetColorByColorWheel() As System.Drawing.Color
        ' Voeg de kleuren toe aan de dropdown list
        Dim colorDialog As New ColorDialog()
        If colorDialog.ShowDialog() = DialogResult.OK Then
            Dim selectedColor = colorDialog.Color
            Return colorDialog.Color
        End If
        Return Nothing
    End Function





    ' *******************************************************************************************************************
    ' DG_SHOW event VALUE CHANGED 
    ' *******************************************************************************************************************   
    Public Async Sub DG_Show_AfterUpdateCellValue(sender As Object, e As DataGridViewCellEventArgs, DG_Show As DataGridView, DG_Effecten As DataGridView, DG_Paletten As DataGridView)
        ' Veiligheidscontroles
        If DG_Show Is Nothing OrElse e Is Nothing Then Return
        If DG_Show.Rows.Count = 0 OrElse e.RowIndex < 0 OrElse e.ColumnIndex < 0 Then Return

        Dim row As DataGridViewRow = DG_Show.Rows(e.RowIndex)
        If row Is Nothing OrElse row.IsNewRow Then Return

        Dim changedColName As String = DG_Show.Columns(e.ColumnIndex).Name

        ' Alleen reageren op relevante kolommen
        If changedColName <> "colFixture" AndAlso changedColName <> "colEffect" AndAlso changedColName <> "colPalette" Then
            Return
        End If

        ' Zorg dat CurrentCell gezet is voor helpers die CurrentRow gebruiken
        If DG_Show.CurrentCell Is Nothing Then
            DG_Show.CurrentCell = row.Cells(e.ColumnIndex)
        End If

        ' Haal waardes op van de rij waar de wijziging plaatsvond
        Dim wledName As String = ""
        Dim wledIP As String = ""
        Dim wledSegment As String = ""

        Dim fixtureValue As String = TryCast(row.Cells("colFixture").Value, String)

        If Not String.IsNullOrEmpty(fixtureValue) Then
            If fixtureValue.Contains("/") Then
                Dim parts = fixtureValue.Split("/"c)
                wledName = parts(0)
                wledSegment = If(parts.Length > 1, parts(1), "")
            Else
                wledName = fixtureValue
                wledSegment = ""
            End If
            wledIP = GetIpFromWLedName(wledName)
        End If

        If wledName = "** Video **" Then
            Exit Sub
        End If

        Select Case changedColName
            Case "colFixture"
                UpdateEffectenPulldown_ForCurrentFixure(DG_Show)
                UpdatePalettePulldown_ForCurrentFixure(DG_Show)
                UpdateOtherFields_ForCurrentFixure(DG_Show, e.RowIndex)
                AfterUpdateEffectOrPaletteId_UpdateEffectAndPaletteName(DG_Show, DG_Effecten, DG_Paletten)

            Case "colEffect"
                Dim effectName = TryCast(row.Cells("colEffect").Value, String)
                row.Cells("colEffectId").Value = GetEffectIdFromName(effectName, DG_Effecten)

            Case "colPalette"
                Dim paletteName = TryCast(row.Cells("colPalette").Value, String)
                row.Cells("colPaletteId").Value = GetPaletteIdFromName(paletteName, DG_Paletten)
        End Select
    End Sub


    Sub Update_DGGRid_Details(DG_Show As DataGridView, RowId As Integer)


        Dim PaletteImagesPath As String = My.Settings.PaletteImagesPath
        Dim EffectsImagesPath As String = My.Settings.EffectsImagePath

        Dim imagePath As String = ""

        Dim CurrentRow = DG_Show.Rows(RowId)

        If Not IsNothing(CurrentRow) Then
            ' Controleer of er exact één rij geselecteerd is
            If DG_Show.SelectedRows.Count = 1 Then
                ' Is het een regel voor video of voor led control?

                Dim FixtureString As String = CurrentRow.Cells("colFixture").Value
                If (IsNothing(FixtureString) Or FixtureString = "") Then
                    Exit Sub
                End If

                If (FixtureString.Substring(0, 2) = "**") Then
                    ' VIDEO
                    Exit Sub
                Else
                    ' WLED 
                    FrmMain.gb_DetailWLed.Visible = True

                    Dim PaletteName As String = CurrentRow.Cells("colPalette").Value
                    Dim EffectName As String = CurrentRow.Cells("colEffect").Value

                    FrmMain.detailWLed_Brightness.Value = CurrentRow.Cells("colBrightness").Value
                    FrmMain.detailWLed_Intensity.Value = CurrentRow.Cells("colIntensity").Value
                    FrmMain.detailWLed_Speed.Value = CurrentRow.Cells("colSpeed").Value
                    If CurrentRow.Cells("colColor1").Value IsNot Nothing Then
                        FrmMain.detailWLed_Color1.BackColor = ColorTranslator.FromHtml(CurrentRow.Cells("colColor1").Value.ToString())
                    End If
                    If CurrentRow.Cells("colColor2").Value IsNot Nothing Then
                        FrmMain.detailWLed_Color2.BackColor = ColorTranslator.FromHtml(CurrentRow.Cells("colColor2").Value.ToString())
                    End If
                    If CurrentRow.Cells("colColor3").Value IsNot Nothing Then
                        FrmMain.detailWLed_Color3.BackColor = ColorTranslator.FromHtml(CurrentRow.Cells("colColor3").Value.ToString())
                    End If

                    ' Toonplaatje van palette
                    If PaletteName IsNot Nothing Then
                        PaletteName = PaletteName.ToString().Replace(" ", "_") & ".png"
                        PaletteName = PaletteName.ToString().Replace("*_", "")
                        imagePath = Path.Combine(PaletteImagesPath, PaletteName)
                    End If

                    ' Controleer of het bestand bestaat voordat je het laadt.
                    If File.Exists(imagePath) Then
                        Try
                            ' Laad de afbeelding en wijs deze toe aan de cel.
                            Dim image As Image = Image.FromFile(imagePath)

                            FrmMain.detailWLed_Palette.Image = image
                        Catch ex As Exception
                            ' Foutafhandeling: Log de fout en toon een bericht.
                            Console.WriteLine($"Fout bij het laden van afbeelding: {imagePath}. Fout: {ex.Message}")
                            ' Je kunt er ook voor kiezen om een standaardafbeelding in te stellen of de cel leeg te laten.

                        End Try
                    Else
                        ' Als het bestand niet bestaat, laat de cel dan leeg en log een waarschuwing.
                        Console.WriteLine($"Afbeelding niet gevonden: {imagePath}")
                    End If



                    ' Toon plaatje van effect
                    If EffectName IsNot Nothing Then
                        EffectName = EffectName.ToString().Replace(" ", "_") & ".gif"
                        EffectName = EffectName.ToString().Replace("*_", "")
                        imagePath = Path.Combine(EffectsImagesPath, EffectName)

                        ' Controleer of het bestand bestaat voordat je het laadt.
                        If File.Exists(imagePath) Then
                            Try
                                ' Laad de afbeelding en wijs deze toe aan de cel.
                                Dim image As Image = Image.FromFile(imagePath)
                                gifImage = image

                                ' Initialiseert de timer voor de animatie
                                frameTimer = New Timer()
                                frameTimer.Interval = 100  ' Standaard interval, wordt later overschreven door de GIF's frame delays.
                                AddHandler frameTimer.Tick, AddressOf FrameTimer_Tick
                                frameTimer.Start()

                                FrmMain.detailWLed_Effect.Image = image

                                ' Haal de frame delays op en sla ze op in een array
                                If gifImage IsNot Nothing Then
                                    Dim frameDimension As New FrameDimension(gifImage.FrameDimensionsList(0))
                                    Dim frameCount As Integer = gifImage.GetFrameCount(FrameDimension.Time)
                                    ReDim frameDelayList(frameCount - 1) ' Array initialiseren met de juiste grootte

                                    For i As Integer = 0 To frameCount - 1
                                        gifImage.SelectActiveFrame(frameDimension, i)
                                        Dim frameDelayBytes() As Byte = gifImage.GetPropertyItem(207).Value ' Property ID 207 bevat de frame delays
                                        frameDelayList(i) = BitConverter.ToInt32(frameDelayBytes, i * 4) * 10 ' Omzetten naar milliseconden
                                    Next

                                    ' Start de animatie met de eerste frame delay
                                    If frameDelayList.Length > 0 Then
                                        frameTimer.Interval = frameDelayList(0)
                                    End If
                                End If


                            Catch ex As Exception
                                ' Foutafhandeling: Log de fout en toon een bericht.
                                Console.WriteLine($"Fout bij het laden van afbeelding: {imagePath}. Fout: {ex.Message}")
                                ' Je kunt er ook voor kiezen om een standaardafbeelding in te stellen of de cel leeg te laten.

                            End Try
                        Else
                            ' Als het bestand niet bestaat, laat de cel dan leeg en log een waarschuwing.
                            Console.WriteLine($"Afbeelding niet gevonden: {imagePath}")
                        End If
                    End If


                    FrmMain.detailWLed__EffectName.Text = CurrentRow.Cells("colEffect").Value
                End If
            Else
                ' Meerdere regels geselecterd
                FrmMain.gb_DetailWLed.Visible = False
            End If
        End If
    End Sub


    Private Sub FrameTimer_Tick(sender As Object, e As EventArgs)
        Dim frameDimension As New FrameDimension(gifImage.FrameDimensionsList(0))

        ' Gaat naar het volgende frame
        currentFrame = (currentFrame + 1) Mod gifImage.GetFrameCount(FrameDimension.Time)

        ' Selecteert het actieve frame
        gifImage.SelectActiveFrame(frameDimension, currentFrame)

        ' Tekent het huidige frame in de PictureBox
        FrmMain.detailWLed_Effect.Invalidate() ' Forceer PictureBox om opnieuw te tekenen

        ' Stel het timer interval in op de delay van het huidige frame
        If frameDelayList.Length > 0 Then
            If frameDelayList(currentFrame) > 0 Then
                frameTimer.Interval = frameDelayList(currentFrame)
            Else
                frameTimer.Interval = 100 ' Standaard interval als er geen delay is     
            End If
        End If
    End Sub


    Public Sub Show_PaintEvent(sender As Object, e As PaintEventArgs)
        ' Tekent het huidige frame van de GIF
        If gifImage IsNot Nothing Then
            e.Graphics.DrawImage(gifImage, 0, 0, FrmMain.detailWLed_Effect.Width, FrmMain.detailWLed_Effect.Height)
        End If
    End Sub

    Sub UpdateBlinkingButton()

        If My.Settings.Locked Then
            FrmMain.gb_Controls.Enabled = True

            ' Anchor location for the "single" next button (use Next Event's position)
            Dim primaryLoc As Point = FrmMain.btnControl_NextEvent.Location

            ' Start button (unchanged, still blinks)
            If booleanBlinkStart Then
                If FrmMain.btnControl_Start.BackColor = Color.Black Then
                    FrmMain.btnControl_Start.BackColor = Color.Green
                Else
                    FrmMain.btnControl_Start.BackColor = Color.Black
                End If
            Else
                FrmMain.btnControl_Start.BackColor = Color.Black
            End If

            ' Decide which of the Next buttons is the active one
            Dim showEvent As Boolean = booleanBlinkNextEvent
            Dim showScene As Boolean = booleanBlinkNextScene
            Dim showAct As Boolean = booleanBlinkNextAct

            ' If none are active, default to showing Next Event (non-blinking)
            If Not showEvent AndAlso Not showScene AndAlso Not showAct Then
                showEvent = True
            End If

            ' Show only the active Next button and move it to the primary location
            FrmMain.btnControl_NextEvent.Visible = showEvent
            FrmMain.btnControl_NextScene.Visible = showScene
            FrmMain.btnControl_NextAct.Visible = showAct

            If showEvent Then FrmMain.btnControl_NextEvent.Location = primaryLoc
            If showScene Then FrmMain.btnControl_NextScene.Location = primaryLoc
            If showAct Then FrmMain.btnControl_NextAct.Location = primaryLoc

            ' Blink the active Next button only
            If booleanBlinkNextEvent AndAlso FrmMain.btnControl_NextEvent.Visible Then
                If FrmMain.btnControl_NextEvent.BackColor = Color.Black Then
                    FrmMain.btnControl_NextEvent.BackColor = Color.Green
                Else
                    FrmMain.btnControl_NextEvent.BackColor = Color.Black
                End If
            Else
                FrmMain.btnControl_NextEvent.BackColor = Color.Black
            End If

            If booleanBlinkNextScene AndAlso FrmMain.btnControl_NextScene.Visible Then
                If FrmMain.btnControl_NextScene.BackColor = Color.Black Then
                    FrmMain.btnControl_NextScene.BackColor = Color.Green
                Else
                    FrmMain.btnControl_NextScene.BackColor = Color.Black
                End If
            Else
                FrmMain.btnControl_NextScene.BackColor = Color.Black
            End If

            If booleanBlinkNextAct AndAlso FrmMain.btnControl_NextAct.Visible Then
                If FrmMain.btnControl_NextAct.BackColor = Color.Black Then
                    FrmMain.btnControl_NextAct.BackColor = Color.Green
                Else
                    FrmMain.btnControl_NextAct.BackColor = Color.Black
                End If
            Else
                FrmMain.btnControl_NextAct.BackColor = Color.Black
            End If

            ' Stop button (unchanged)
            If booleanBlinkStop Then
                If FrmMain.btnControl_StopAll.BackColor = Color.Black Then
                    FrmMain.btnControl_StopAll.BackColor = Color.Red
                Else
                    FrmMain.btnControl_StopAll.BackColor = Color.Black
                End If
            Else
                FrmMain.btnControl_StopAll.BackColor = Color.Black
            End If

            ' Timer: blink when active, otherwise hide entirely
            FrmMain.lblControl_TimeLeft.Visible = booleanBlinkTimer
            If booleanBlinkTimer Then
                If FrmMain.lblControl_TimeLeft.BackColor = Color.Black Then
                    FrmMain.lblControl_TimeLeft.BackColor = colorBlinkTimer
                Else
                    FrmMain.lblControl_TimeLeft.BackColor = Color.Black
                End If
            Else
                FrmMain.lblControl_TimeLeft.BackColor = Color.Black
            End If

            ' Stop looping (unchanged)
            If booleanBlinkStopLooping Then
                If FrmMain.btnStopLoopingAtEndOfVideo.BackColor = Color.Black Then
                    FrmMain.btnStopLoopingAtEndOfVideo.BackColor = Color.Red
                Else
                    FrmMain.btnStopLoopingAtEndOfVideo.BackColor = Color.Black
                End If
            Else
                FrmMain.btnStopLoopingAtEndOfVideo.BackColor = Color.Black
            End If

        Else
            ' Unlocked (edit) mode: disable controls and present a single Next button view
            FrmMain.gb_Controls.Enabled = False
            FrmMain.btnControl_Start.BackColor = Color.DarkRed
            FrmMain.btnControl_NextEvent.BackColor = Color.DarkRed
            FrmMain.btnControl_NextScene.BackColor = Color.DarkRed
            FrmMain.btnControl_NextAct.BackColor = Color.DarkRed
            FrmMain.btnControl_StopAll.BackColor = Color.DarkRed
            FrmMain.btnStopLoopingAtEndOfVideo.BackColor = Color.Black

            ' Show one next button at the primary location, hide others, hide timer
            Dim primaryLoc As Point = FrmMain.btnControl_NextEvent.Location
            FrmMain.btnControl_NextEvent.Visible = True : FrmMain.btnControl_NextEvent.Location = primaryLoc
            FrmMain.btnControl_NextScene.Visible = False
            FrmMain.btnControl_NextAct.Visible = False
            FrmMain.lblControl_TimeLeft.BackColor = Color.Black
            FrmMain.lblControl_TimeLeft.Visible = False
        End If

    End Sub

    Sub EndEventTimer()
        colorBlinkTimer = Color.DarkRed
        FrmMain.TimerNextEvent.Stop()

        booleanBlinkNextEvent = True


    End Sub


    ' Helper: sets blinking based on what is next from a given active position
    Private Sub DecideNextBlinking(DG_Show As DataGridView, activeIndex As Integer, activeAct As String, activeSceneId As Integer, activeEventId As Integer)
        booleanBlinkNextEvent = False
        booleanBlinkNextScene = False
        booleanBlinkNextAct = False

        Dim hasNextEventSameScene As Boolean = False
        Dim hasNextSceneSameAct As Boolean = False
        Dim hasNextAct As Boolean = False

        For Each row As DataGridViewRow In DG_Show.Rows
            If row.IsNewRow OrElse row.Index <= activeIndex Then Continue For

            Dim act = Convert.ToString(row.Cells("colAct").Value)
            Dim sceneId = Convert.ToInt32(row.Cells("colSceneId").Value)
            Dim eventId = Convert.ToInt32(row.Cells("colEventId").Value)

            If act = activeAct Then
                If sceneId = activeSceneId AndAlso eventId > activeEventId Then
                    hasNextEventSameScene = True
                    Exit For
                End If
                If sceneId > activeSceneId Then
                    hasNextSceneSameAct = True
                    ' do not Exit; a nearer next event would have exited earlier
                End If
            Else
                hasNextAct = True
                ' we don't break here; we prefer event>scene before act
            End If
        Next

        If hasNextEventSameScene Then
            booleanBlinkNextEvent = True
        ElseIf hasNextSceneSameAct Then
            booleanBlinkNextScene = True
        ElseIf hasNextAct Then
            booleanBlinkNextAct = True
        End If
    End Sub

    Sub Next_EventOrScene(DG_Show As DataGridView, NextEventOrScene As Integer)
        ' NextEventOrScene: 0 = Scene, 1 = Event

        ' First stop any playing video's
        Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.stop()
        Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.stop()
        FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.stop()
        FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.stop()

        If DG_Show.SelectedRows.Count = 0 Then Exit Sub

        ' 1. Get current act, scene, event from the first selected row
        Dim currentRow As DataGridViewRow = DG_Show.SelectedRows(0)
        Dim currentAct As String = Convert.ToString(currentRow.Cells("colAct").Value)
        Dim currentSceneId As Integer = Convert.ToInt32(currentRow.Cells("colSceneId").Value)
        Dim currentEventId As Integer = Convert.ToInt32(currentRow.Cells("colEventId").Value)
        Dim currentRowId As Integer = Convert.ToInt32(currentRow.Index)

        ' 2. Find the next event or scene
        Dim nextAct As String = ""
        Dim nextSceneId As Integer = -1
        Dim nextEventId As Integer = -1
        Dim found As Boolean = False

        ' Helper function to test match
        Dim matches As Func(Of DataGridViewRow, Boolean)
        If NextEventOrScene = 1 Then
            ' Next Event
            matches = Function(r As DataGridViewRow)
                          Dim act = Convert.ToString(r.Cells("colAct").Value)
                          Dim sceneId = Convert.ToInt32(r.Cells("colSceneId").Value)
                          Dim eventId = Convert.ToInt32(r.Cells("colEventId").Value)
                          Return act = currentAct AndAlso sceneId = currentSceneId AndAlso eventId > currentEventId
                      End Function
        Else
            ' Next Scene
            matches = Function(r As DataGridViewRow)
                          Dim act = Convert.ToString(r.Cells("colAct").Value)
                          Dim sceneId = Convert.ToInt32(r.Cells("colSceneId").Value)
                          Return act = currentAct AndAlso sceneId > currentSceneId
                      End Function
        End If

        ' Pass 1: within current act
        For Each row As DataGridViewRow In DG_Show.Rows
            If row.Index <= currentRowId OrElse row.IsNewRow Then Continue For
            If matches(row) Then
                nextAct = Convert.ToString(row.Cells("colAct").Value)
                nextSceneId = Convert.ToInt32(row.Cells("colSceneId").Value)
                nextEventId = Convert.ToInt32(row.Cells("colEventId").Value)
                found = True
                Exit For
            End If
        Next

        ' Pass 2: move to next act (first eligible row) if nothing found in current act
        If Not found Then
            Dim currentActFound As Boolean = False
            For Each row As DataGridViewRow In DG_Show.Rows
                If row.IsNewRow Then Continue For
                Dim act = Convert.ToString(row.Cells("colAct").Value)
                Dim sceneId = Convert.ToInt32(row.Cells("colSceneId").Value)
                Dim eventId = Convert.ToInt32(row.Cells("colEventId").Value)

                If act = currentAct Then
                    currentActFound = True
                    Continue For
                End If

                ' First row after current act block
                If currentActFound Then
                    nextAct = act
                    nextSceneId = sceneId
                    nextEventId = eventId
                    found = True
                    Exit For
                End If
            Next
        End If

        If Not found Then Exit Sub ' No next step found

        ' 3. Mark btnApply for the *new* group, clear others, remember activeIndex
        Dim active As Boolean = False
        Dim FollowUpRow As DataGridViewRow = Nothing
        Dim activeIndex As Integer = -1

        For Each row As DataGridViewRow In DG_Show.Rows
            If row.IsNewRow Then Continue For

            If Convert.ToString(row.Cells("colAct").Value) = nextAct AndAlso
               Convert.ToInt32(row.Cells("colSceneId").Value) = nextSceneId AndAlso
               Convert.ToInt32(row.Cells("colEventId").Value) = nextEventId Then
                row.Cells("btnApply").Value = ">"
                row.Cells("colSend").Value = "False"
                active = True
                activeIndex = row.Index
            Else
                If (active AndAlso FollowUpRow Is Nothing) Then
                    FollowUpRow = row
                End If

                row.Cells("btnApply").Value = ""
                row.Cells("colSend").Value = "False"
            End If
        Next

        ' 5. Send instructions for all rows with btnApply = ">" and set colSend = "True"
        For Each row As DataGridViewRow In DG_Show.Rows
            If row.IsNewRow Then Continue For
            If Convert.ToString(row.Cells("btnApply").Value) = ">" AndAlso Convert.ToString(row.Cells("colSend").Value) = "False" Then
                SendInstructionSetForDevice(DG_Show, row)
                row.Cells("colSend").Value = "True"
            End If
        Next

        ' 6. Update the next scene/event/act variables based on the followup row
        booleanBlinkStart = False
        booleanBlinkTimer = False
        booleanBlinkNextEvent = False
        booleanBlinkNextScene = False
        booleanBlinkNextAct = False
        booleanBlinkStop = False

        Dim timerValue As String = ""
        If FollowUpRow IsNot Nothing Then
            timerValue = Convert.ToString(FollowUpRow.Cells("colTimer").Value)
        End If
        FrmMain.lblControl_TimeLeft.Text = timerValue

        If timerValue <> "" Then
            FrmMain.TimerNextEvent.Interval = TimeStringToMilliseconds(timerValue)
            FrmMain.TimerNextEvent.Start()
            FrmMain.lblControl_TimeLeft.Text = timerValue
            colorBlinkTimer = Color.Green
            booleanBlinkTimer = True
        Else
            ' Decide which button should blink next based on look-ahead
            DecideNextBlinking(DG_Show, activeIndex, nextAct, nextSceneId, nextEventId)
        End If

        ' 7. Select the previous active rows
        Reselect_Rows(DG_Show)
    End Sub

    Public Sub ClearGroupsToBlack_WithBlackSolidEffect()
        ' Loop through all WLED devices
        For Each devRow As DataGridViewRow In FrmMain.DG_Devices.Rows
            If devRow.IsNewRow Then Continue For

            Dim wledIP As String = Convert.ToString(devRow.Cells("colIPAddress").Value)
            Dim segmentsValue As String = Convert.ToString(devRow.Cells("colSegments").Value)

            If String.IsNullOrWhiteSpace(wledIP) OrElse String.IsNullOrWhiteSpace(segmentsValue) Then Continue For

            ' Find number of segments
            Dim segmentCount As Integer = 0
            Dim matches = System.Text.RegularExpressions.Regex.Matches(segmentsValue, "\([^\)]+\)")
            segmentCount = matches.Count

            For segmentIndex As Integer = 0 To segmentCount - 1
                ' Build JSON for solid effect, color black
                Dim json As String = Newtonsoft.Json.JsonConvert.SerializeObject(New With {
                .seg = New Object() {
                    New With {
                        .id = segmentIndex,
                        .fx = 0, ' Solid effect
                        .col = New Integer()() {New Integer() {0, 0, 0}},
                        .bri = 255
                    }
                }
            })

                Try
                    Using client As New Net.WebClient()
                        client.Headers(Net.HttpRequestHeader.ContentType) = "application/json"
                        client.UploadString($"http://{wledIP}/json/state", "POST", json)
                    End Using
                Catch ex As Exception
                    Console.WriteLine($"Error sending black to WLED {wledIP} segment {segmentIndex}: {ex.Message}")
                End Try
            Next
        Next
    End Sub


    Sub Start_Show(DG_Show As DataGridView)
        Dim FoundRows As Integer = 0
        Dim LastRow As DataGridViewRow = Nothing

        ResetProcessedCheckboxes(DG_Show)
        ClearGroupsToBlack_WithBlackSolidEffect()

        For Each row In DG_Show.Rows
            If row.cells("colAct").value = "Pre-Show" And row.cells("colSceneId").value = "1" And row.cells("colEventId").value = "1" Then
                FoundRows = FoundRows + 1
                row.cells("btnApply").value = ">"
            Else
                If LastRow Is Nothing Then LastRow = row
                row.cells("btnApply").value = ""
            End If
        Next

        For Each row In DG_Show.Rows
            If row.cells("btnApply").value = ">" And row.cells("colSend").value = "False" Then
                If row.Cells("colFixture").Value.ToString().ToLower().Contains("video") Then
                    ApplyRowToBeamer(row)
                Else
                    SendInstructionSetForDevice(DG_Show, row)
                End If
            End If
        Next

        booleanBlinkStart = False
        booleanBlinkTimer = False
        booleanBlinkNextEvent = False
        booleanBlinkNextScene = False
        booleanBlinkNextAct = False
        booleanBlinkStop = False
        booleanBlinkStopLooping = False
        FrmMain.lblControl_TimeLeft.Text = ""

        ' Timer has priority
        If (LastRow IsNot Nothing) AndAlso (LastRow.Cells("colTimer").Value <> "") Then
            booleanBlinkTimer = True
            colorBlinkTimer = Color.Green
            FrmMain.TimerNextEvent.Interval = TimeStringToMilliseconds(LastRow.Cells("colTimer").Value)
            FrmMain.TimerNextEvent.Start()
            FrmMain.lblControl_TimeLeft.Text = LastRow.Cells("colTimer").Value
        Else
            ' Find last active index and decide blinking
            Dim activeIdx As Integer = -1
            Dim activeAct As String = ""
            Dim activeScene As Integer = -1
            Dim activeEvent As Integer = -1
            For Each r As DataGridViewRow In DG_Show.Rows
                If r.IsNewRow Then Continue For
                If Convert.ToString(r.Cells("btnApply").Value) = ">" Then
                    activeIdx = r.Index
                    activeAct = Convert.ToString(r.Cells("colAct").Value)
                    activeScene = Convert.ToInt32(r.Cells("colSceneId").Value)
                    activeEvent = Convert.ToInt32(r.Cells("colEventId").Value)
                End If
            Next
            If activeIdx >= 0 Then
                DecideNextBlinking(DG_Show, activeIdx, activeAct, activeScene, activeEvent)
            End If
        End If

        Reselect_Rows(DG_Show)
    End Sub

    ' Make sure new flag is reset in StopAll
    Public Sub StopAll()
        If Not booleanBlinkStop Then
            booleanBlinkStop = True
            ToonFlashBericht("Druk nogmaals op show te stoppen!", 1, FlashSeverity.IsWarning)
        Else
            ToonFlashBericht("Show " & My.Settings.ProjectName & " gestopt.", 30, FlashSeverity.IsInfo)

            FrmMain.btnControl_StopAll.BackColor = Color.DarkRed
            booleanBlinkStop = False
            booleanBlinkStart = False
            booleanBlinkNextEvent = False
            booleanBlinkNextScene = False
            booleanBlinkNextAct = False
            booleanBlinkTimer = False

            ClearGroupsToBlack_WithBlackSolidEffect()

            Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.stop()
            FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.stop()
            Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.stop()
            FrmMain.WMP_SecondairyPlayer_Preview.Ctlcontrols.stop()

            DeselectAllRowsOfDGShow()
        End If
    End Sub


    Public Sub Reselect_Rows(DG_Show As DataGridView)
        For Each row In DG_Show.Rows
            If row.cells("btnApply").value = ">" Then
                row.selected = True
            Else
                row.selected = False
            End If

        Next
    End Sub


    Public Sub DeselectAllRowsOfDGShow()
        For Each row As DataGridViewRow In FrmMain.DG_Show.Rows
            row.Selected = False
            If row.Cells("btnApply") IsNot Nothing Then
                row.Cells("btnApply").Value = " "
            End If
        Next
    End Sub

    ' New: go to next act, optionally apply a filter combobox
    Public Sub Next_Act(DG_Show As DataGridView, Optional filterAct As ToolStripComboBox = Nothing)
        ' Stop any playing videos
        Beamer_Primary.WMP_PrimaryPlayer_Live.Ctlcontrols.stop()
        Beamer_Secondairy.WMP_SecondairyPlayer_Live.Ctlcontrols.stop()
        FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.stop()
        FrmMain.WMP_PrimaryPlayer_Preview.Ctlcontrols.stop()

        If DG_Show.SelectedRows.Count = 0 Then Exit Sub

        Dim currentRow As DataGridViewRow = DG_Show.SelectedRows(0)
        Dim currentAct As String = Convert.ToString(currentRow.Cells("colAct").Value)
        Dim currentIndex As Integer = currentRow.Index

        ' Find first row of the next act
        Dim nextAct As String = Nothing
        Dim firstScene As Integer = -1
        Dim firstEvent As Integer = -1
        Dim found As Boolean = False

        Dim leftCurrentAct As Boolean = False
        For Each row As DataGridViewRow In DG_Show.Rows
            If row.IsNewRow Then Continue For
            If row.Index <= currentIndex Then Continue For

            Dim act = Convert.ToString(row.Cells("colAct").Value)
            Dim sceneId = Convert.ToInt32(row.Cells("colSceneId").Value)
            Dim eventId = Convert.ToInt32(row.Cells("colEventId").Value)

            If Not leftCurrentAct AndAlso act = currentAct Then
                Continue For
            End If

            If Not leftCurrentAct AndAlso act <> currentAct Then
                ' We hit the next act for the first time
                leftCurrentAct = True
                nextAct = act
                firstScene = sceneId
                firstEvent = eventId
                found = True
                Exit For
            End If
        Next

        If Not found Then Exit Sub

        ' Mark all rows that belong to nextAct + firstScene + firstEvent
        Dim activeIndex As Integer = -1
        For Each row As DataGridViewRow In DG_Show.Rows
            If row.IsNewRow Then Continue For
            Dim act = Convert.ToString(row.Cells("colAct").Value)
            Dim sceneId = Convert.ToInt32(row.Cells("colSceneId").Value)
            Dim eventId = Convert.ToInt32(row.Cells("colEventId").Value)

            If act = nextAct AndAlso sceneId = firstScene AndAlso eventId = firstEvent Then
                row.Cells("btnApply").Value = ">"
                row.Cells("colSend").Value = "False"
                activeIndex = Math.Max(activeIndex, row.Index)
            Else
                row.Cells("btnApply").Value = ""
                row.Cells("colSend").Value = "False"
            End If
        Next

        ' Send instructions
        For Each row As DataGridViewRow In DG_Show.Rows
            If row.IsNewRow Then Continue For
            If Convert.ToString(row.Cells("btnApply").Value) = ">" AndAlso Convert.ToString(row.Cells("colSend").Value) = "False" Then
                SendInstructionSetForDevice(DG_Show, row)
                row.Cells("colSend").Value = "True"
            End If
        Next

        ' Update filter (optional)
        If filterAct IsNot Nothing Then
            ' Ensure the item exists in combobox
            Dim exists As Boolean = False
            For Each it In filterAct.Items
                If String.Equals(Convert.ToString(it), nextAct, StringComparison.OrdinalIgnoreCase) Then
                    exists = True
                    Exit For
                End If
            Next
            If Not exists Then filterAct.Items.Add(nextAct)
            filterAct.SelectedItem = nextAct
            FilterDG_Show(DG_Show, filterAct)
        End If

        ' Update blinking and timer
        booleanBlinkStart = False
        booleanBlinkTimer = False
        booleanBlinkNextEvent = False
        booleanBlinkNextScene = False
        booleanBlinkNextAct = False
        booleanBlinkStop = False

        Dim timerValue As String = ""
        ' Find the first row after the active block to read its timer (if any)
        Dim followUpRow As DataGridViewRow = Nothing
        For Each row As DataGridViewRow In DG_Show.Rows
            If row.IsNewRow Then Continue For
            If row.Index > activeIndex Then
                followUpRow = row
                Exit For
            End If
        Next

        If followUpRow IsNot Nothing Then
            timerValue = Convert.ToString(followUpRow.Cells("colTimer").Value)
        End If

        FrmMain.lblControl_TimeLeft.Text = timerValue
        If timerValue <> "" Then
            FrmMain.TimerNextEvent.Interval = TimeStringToMilliseconds(timerValue)
            FrmMain.TimerNextEvent.Start()
            colorBlinkTimer = Color.Green
            booleanBlinkTimer = True
        Else
            ' Decide next blinking from the new active state
            DecideNextBlinking(DG_Show, activeIndex, nextAct, firstScene, firstEvent)
        End If

        Reselect_Rows(DG_Show)
    End Sub
End Module

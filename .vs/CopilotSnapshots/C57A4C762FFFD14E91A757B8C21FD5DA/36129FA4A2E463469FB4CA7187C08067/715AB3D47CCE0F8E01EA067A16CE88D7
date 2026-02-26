Imports System.ComponentModel
Imports System.Drawing.Design
Imports System.Net
Imports System.Net.Http
Imports System.Text
Imports System.Text.RegularExpressions
Imports System.Threading.Tasks.Dataflow
Imports System.Windows.Forms.AxHost
Imports Newtonsoft.Json.Linq


Module WLEDControl


    ' ****************************************************************************************
    '  Stuur een effect naar de WLED-instantie.
    ' ****************************************************************************************
    Public Async Function SendEffectToWLed(IPAddress As String, Segment As String, effectId As Integer) As Task
        Using client As New HttpClient()
            Try
                ' Bouw de JSON-payload voor het POST-verzoek
                Dim payload As String = "{""seg"":[{""fx"":" & effectId & ",""id"":""" & Segment & """}]}"

                Dim content As New StringContent(payload, Encoding.UTF8, "application/json")

                ' Stuur het POST-verzoek naar de WLED API
                Dim postResponse As HttpResponseMessage = Await client.PostAsync("http://" + IPAddress + "/json/state", content)

                ' Lees de volledige responsinhoud
                Dim responseContent As String = Await postResponse.Content.ReadAsStringAsync()

                ' Plaats de respons in het tekstveld
                FrmMain.txt_APIResult.Text = responseContent

                ' Controleer de statuscode van het antwoord
                If postResponse.IsSuccessStatusCode Then
                    FrmMain.txt_APIResult.Text = $"Effect met ID '{effectId}' toegepast op '{IPAddress }'."
                Else
                    MessageBox.Show($"Fout bij het toepassen van effect (HTTP {postResponse.StatusCode}): {responseContent}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
                End If
            Catch ex As HttpRequestException
                FrmMain.txt_APIResult.Text = $"Fout bij het toepassen van effect: {ex.Message}"
                ToonFlashBericht($"Fout bij het toepassen van effect: {ex.Message}", 2)
            Catch ex As TaskCanceledException
                FrmMain.txt_APIResult.Text = "Timeout bij het toepassen van effect."
                ToonFlashBericht("Timeout bij het toepassen van effect.", 2)
            Catch ex As Exception
                FrmMain.txt_APIResult.Text = $"Onverwachte fout: {ex.Message}"
                ToonFlashBericht($"Onverwachte fout: {ex.Message}", 2)
            End Try
        End Using
    End Function


    ' *********************************************************
    ' Deze functie stuurt een POST-verzoek naar de WLED API om het effect toe te passen
    ' *********************************************************
    Public Async Function SendPaletteToWLed(ipAddress As String, paletteId As Integer) As Task
        ' Bouw de JSON-payload voor het POST-verzoek
        Dim payload As String = "{""seg"":[{""pal"":" & paletteId & "}]}"

        Dim content As New StringContent(payload, Encoding.UTF8, "application/json")

        Using client As New HttpClient()
            Try

                ' Stuur het POST-verzoek naar de WLED API
                Dim postResponse As HttpResponseMessage = Await client.PostAsync("http://" + ipAddress + "/json/state", content)

                ' Lees de volledige responsinhoud
                Dim responseContent As String = Await postResponse.Content.ReadAsStringAsync()

                ' Plaats de respons in het tekstveld
                FrmMain.txt_APIResult.Text = responseContent

                ' Controleer de statuscode van het antwoord
                If postResponse.IsSuccessStatusCode Then
                    FrmMain.txt_APIResult.Text = $"Palette met ID '{paletteId}' toegepast op '{ipAddress}'."
                Else
                    MessageBox.Show($"Fout bij het toepassen van effect (HTTP {postResponse.StatusCode}): {responseContent}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
                End If
            Catch ex As HttpRequestException
                FrmMain.txt_APIResult.Text = $"Fout bij het toepassen van palette: {ex.Message}"
                MessageBox.Show($"Fout bij het toepassen van palette: {ex.Message}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
            Catch ex As TaskCanceledException
                FrmMain.txt_APIResult.Text = "Timeout bij het toepassen van palette."
                MessageBox.Show("Timeout bij het toepassen van palette.", "Timeout", MessageBoxButtons.OK, MessageBoxIcon.Warning)
            Catch ex As Exception
                FrmMain.txt_APIResult.Text = $"Onverwachte fout: {ex.Message}"
                MessageBox.Show($"Onverwachte fout: {ex.Message}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
            End Try
        End Using
    End Function

    ' **********************************************************
    ' Deze functie stuurt de JSON payload naar de WLED API
    ' **********************************************************
    Private Async Function SendJsonToWLED2(ipAddress As String, content As StringContent) As Task
        Using client As New HttpClient()
            Try
                ' Stuur het POST-verzoek naar de WLED API
                Dim postResponse As HttpResponseMessage = Await client.PostAsync("http://" + ipAddress + "/json/state", content)
                postResponse.EnsureSuccessStatusCode()                                                                               ' Throw on error status

                ' Lees de volledige responsinhoud
                Dim responseContent As String = Await postResponse.Content.ReadAsStringAsync()

                ' Plaats de respons in het tekstveld
                FrmMain.txt_APIResult.Text = responseContent



                ' Controleer de statuscode van het antwoord
                If postResponse.IsSuccessStatusCode Then
                    FrmMain.txt_APIResult.Text = $"Succes"
                Else
                    MessageBox.Show($"Fout bij het verzenden van commando naar WLED {ipAddress}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
                End If

            Catch ex As HttpRequestException
                MessageBox.Show($"Fout bij het verzenden van commando naar WLED {ipAddress}: {ex.Message}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
                FrmMain.txt_APIResult.Text = $"Fout: {ex.Message}"


            Catch ex As TaskCanceledException
                MessageBox.Show($"Timeout bij het verzenden van commando naar WLED {ipAddress}.", "Timeout", MessageBoxButtons.OK, MessageBoxIcon.Warning)
                FrmMain.txt_APIResult.Text = "Timeout bij verzenden van commando."

            Catch ex As Exception
                MessageBox.Show($"Onverwachte fout: {ex.Message}", "Fout", MessageBoxButtons.OK, MessageBoxIcon.Error)
                FrmMain.txt_APIResult.Text = $"Fout: {ex.Message}"

            End Try
        End Using
    End Function




    Public Async Sub Apply_DGShowRow_ToWLED(ByVal DG_Show As DataGridView, ByVal DG_Devices As DataGridView, ByVal DG_Effecten As DataGridView, ByVal DG_Paletten As DataGridView, notify As Boolean)
        Dim Payload As String = ""          ' JSON payload
        Dim Segment As String = ""          ' Segment of de WLED
        Dim wledIp As String = ""           ' IPAddress Of WLED
        Dim wledName As String = ""
        Dim stateOnOff As String = "True"
        Dim effectId As String = ""
        Dim effectName As String = ""
        Dim paletteId As String = ""
        Dim paletteName As String = ""
        Dim Speed As String = "127"
        Dim Brightness As String = "255"
        Dim Intensity As String = "127"

        If DG_Show.RowCount = 0 Then
            Exit Sub
        End If

        ' Controleer of er een rij is geselecteerd
        If DG_Show.CurrentCell IsNot Nothing And Not DG_Show.CurrentRow.IsNewRow Then
            Dim currentRow = DG_Show.Rows(DG_Show.CurrentCell.RowIndex)

            Dim selectedFixture = currentRow.Cells("colFixture").Value                      ' De geselecteerde fixture
            If selectedFixture IsNot Nothing And selectedFixture.ToString().Substring(0, 2) <> "**" Then      ' Als deze niet een beamer is
                Dim fixtureParts = selectedFixture.ToString().Split("/"c)
                If fixtureParts.Length = 2 Then
                    wledName = fixtureParts(0)
                    Segment = Integer.Parse(fixtureParts(1))

                    For Each row In DG_Devices.Rows
                        If row.cells("colInstance").value = wledName Then
                            wledIp = row.cells("colIPAddress").value
                            Exit For
                        End If
                    Next

                    If wledIp <> "" Then
                        ' Er is een IP adres aanwezig. Bouw de JSON payload

                        ' Segment aan of uit
                        stateOnOff = currentRow.Cells("colStateOnOff").Value
                        If stateOnOff = "Uit" Then
                            stateOnOff = "false"
                        Else
                            stateOnOff = "true"
                        End If

                        effectName = currentRow.Cells("colEffect").Value
                        effectId = GetEffectIdFromName(effectName, DG_Effecten)
                        paletteName = currentRow.Cells("colPalette").Value
                        paletteId = GetPaletteIdFromName(paletteName, DG_Paletten)

                        ' Gebruik de waarden uit de grid
                        Brightness = currentRow.Cells("colBrightness").Value.ToString()
                        Speed = currentRow.Cells("colSpeed").Value.ToString()
                        Intensity = currentRow.Cells("colIntensity").Value.ToString()

                        '' Kleuren toevoegen
                        'Dim colorList As New List(Of String)
                        'For i As Integer = 1 To 3
                        '    Dim colorKey As DataGridViewColumn = DG_Show.Columns($"colColor{i}")
                        '    If DG_Show.Columns.IndexOf(colorKey) <> -1 Then
                        '        Dim c As Color = ColorTranslator.FromHtml(DG_Show.CurrentRow.Cells(colorKey).Value.ToString())
                        '        colorList.Add($"[{c.R},{c.G},{c.B}]")
                        '    End If
                        'Next
                        'Dim colorArray As String = String.Join(",", colorList)

                        Payload = "{" &
                                  """seg"": [" &
                                  "{" &
                                  """id"": " & Segment.ToString() & "," &
                                  """on"": " & stateOnOff.ToLower() & "," &
                                  """fx"": " & effectId & "," &
                                  """pal"": " & paletteId & "," &
                                  """sel"": true," &
                                  """bri"": " & Brightness & "," &
                                  """sx"": " & Speed & "," &
                                  """ix"": " & Intensity

                        'If colorArray <> "" Then
                        '    Payload &= ",""col"": [" & colorArray & "]"
                        'End If

                        Payload &= "}" &
                                  "]" &
                                  "}"
                    End If
                End If
            End If


            Dim content As New StringContent(Payload, Encoding.UTF8, "application/json")
            Await SendJsonToWLED2(wledIp, content)

            If (notify) Then
                ' Toon een melding dat het effect is toegepast
                ToonFlashBericht("Segment " & Segment & " van " & wledName & " is ingesteld op " & effectName & " met palette " & paletteName, 2)
            End If
        End If
    End Sub

    'Public Sub Apply_Selected_Rows(DG_Show As DataGridView)
    '    Dim rowNr As Integer = 0

    '    For Each row In DG_Show.Rows
    '        If row.cells("btnApply").value = ">" Then
    '            rowNr = row.index
    '            'Stel de focus op de nieuwe rij
    '            DG_Show.CurrentCell = DG_Show.Rows(rowNr).Cells(0)
    '            Apply_DGShowRow_ToWLED(DG_Show, FrmMain.DG_Devices, FrmMain.DG_Effecten, FrmMain.DG_Paletten, False)

    '        End If
    '    Next
    'End Sub



    ' Set segments for each device in DG_Devices based on the colSegments field.
    Public Sub SetSegmentsFromGrid(ByVal DG_Devices As DataGridView)
        For Each devRow As DataGridViewRow In DG_Devices.Rows
            If devRow.IsNewRow Then Continue For

            Dim ip = Convert.ToString(devRow.Cells("colIPAddress").Value)
            Dim segmentsStr = Convert.ToString(devRow.Cells("colSegments").Value)
            If String.IsNullOrWhiteSpace(ip) OrElse String.IsNullOrWhiteSpace(segmentsStr) Then Continue For

            Dim segmentsList As New List(Of JObject)
            Dim matches = System.Text.RegularExpressions.Regex.Matches(segmentsStr, "\((\d+)-(\d+)\)")
            Dim segId As Integer = 0

            For Each m As System.Text.RegularExpressions.Match In matches
                Dim startLed = Integer.Parse(m.Groups(1).Value)
                Dim stopLed = Integer.Parse(m.Groups(2).Value)
                Dim segObj As New JObject From {
                    {"id", segId},
                    {"start", startLed},
                    {"stop", stopLed}
                }
                segmentsList.Add(segObj)
                segId += 1
            Next

            If segmentsList.Count > 0 Then
                Dim payload As New JObject From {
                    {"seg", JArray.FromObject(segmentsList)}
                }
                Try
                    Using client As New WebClient()
                        client.Headers(HttpRequestHeader.ContentType) = "application/json"
                        client.UploadString($"http://{ip}/json/state", "POST", payload.ToString())
                    End Using
                Catch ex As WebException
                    ToonFlashBericht($"[WLED] Device offline of netwerkfout bij {ip}: {ex.Message}", 5, FlashSeverity.IsWarning)
                    devRow.Cells("colOnline").Value = My.Resources.iconRedBullet1
                Catch ex As Exception
                    ToonFlashBericht($"[WLED] Onverwachte fout bij {ip}: {ex.Message}", 5, FlashSeverity.IsError)
                    devRow.Cells("colOnline").Value = My.Resources.iconRedBullet1
                End Try
            End If
        Next
    End Sub


    ' Haal de segmentdata op van elke WLED en sla deze op in colSegmentsData van DG_Devices
    Public Async Sub GetSegmentsDataFromWLED(ByVal DG_Devices As DataGridView)
        For Each devRow As DataGridViewRow In DG_Devices.Rows
            If devRow.IsNewRow Then Continue For

            Dim ip = Convert.ToString(devRow.Cells("colIPAddress").Value)
            If String.IsNullOrWhiteSpace(ip) Then Continue For

            Try
                Using client As New Net.Http.HttpClient()
                    Dim response As Net.Http.HttpResponseMessage = Await client.GetAsync($"http://{ip}/json")
                    If response.IsSuccessStatusCode Then
                        Dim jsonString As String = Await response.Content.ReadAsStringAsync()
                        Dim jObj As JObject = JObject.Parse(jsonString)
                        Dim segArray As JToken = jObj.SelectToken("state.seg")
                        If segArray IsNot Nothing Then
                            devRow.Cells("colSegmentsData").Value = segArray.ToString(Newtonsoft.Json.Formatting.None)
                        Else
                            devRow.Cells("colSegmentsData").Value = ""
                        End If
                    Else
                        devRow.Cells("colSegmentsData").Value = ""
                    End If
                End Using
            Catch ex As Exception
                devRow.Cells("colSegmentsData").Value = ""
                Console.WriteLine($"Fout bij ophalen van segmentdata van {ip}: {ex.Message}")
            End Try
        Next
    End Sub

    ' Send a single row (dictionary) to WLED, using the same logic as Apply_DGShowRow_ToWLED
    Public Sub Apply_RowData_ToWLED(rowData As Dictionary(Of String, Object), DG_Devices As DataGridView, DG_Effecten As DataGridView, DG_Paletten As DataGridView)
        Dim Payload As String = ""
        Dim Segment As String = ""
        Dim wledIp As String = ""
        Dim wledName As String = ""
        Dim stateOnOff As String = ""
        Dim effectId As String = ""
        Dim effectName As String = ""
        Dim paletteId As String = ""
        Dim paletteName As String = ""
        Dim Speed As String = ""
        Dim Brightness As String = ""
        Dim Intensity As String = ""

        Dim selectedFixture = rowData("colFixture")
        If selectedFixture IsNot Nothing AndAlso selectedFixture.ToString().Substring(0, 2) <> "**" Then
            Dim fixtureParts = selectedFixture.ToString().Split("/"c)
            If fixtureParts.Length = 2 Then
                wledName = fixtureParts(0)
                Segment = fixtureParts(1)

                For Each row As DataGridViewRow In DG_Devices.Rows
                    If row.Cells("colInstance").Value = wledName Then
                        wledIp = row.Cells("colIPAddress").Value
                        Exit For
                    End If
                Next

                If wledIp <> "" Then
                    stateOnOff = If(CBool(rowData("colStateOnOff")), "true", "false")
                    effectName = rowData("colEffect").ToString()
                    effectId = GetEffectIdFromName(effectName, DG_Effecten)
                    paletteName = rowData("colPalette").ToString()
                    paletteId = GetPaletteIdFromName(paletteName, DG_Paletten)
                    Brightness = rowData("colBrightness").ToString()
                    Speed = rowData("colSpeed").ToString()
                    Intensity = rowData("colIntensity").ToString()

                    ' Convert HTML color to RGB array
                    Dim colorList As New List(Of String)
                    For i As Integer = 1 To 3
                        Dim colorKey = $"colColor{i}"
                        If rowData.ContainsKey(colorKey) AndAlso rowData(colorKey) IsNot Nothing Then
                            Dim c As Color = ColorTranslator.FromHtml(rowData(colorKey).ToString())
                            colorList.Add($"[{c.R},{c.G},{c.B}]")
                        End If
                    Next
                    Dim colorArray As String = String.Join(",", colorList)

                    Payload = "{" &
                              """seg"": [" &
                              "{" &
                              """id"": " & Segment & "," &
                              """on"": " & stateOnOff.ToLower() & "," &
                              """fx"": " & effectId & "," &
                              """pal"": " & paletteId & "," &
                              """sel"": true," &
                              """bri"": " & Brightness & "," &
                              """sx"": " & Speed & "," &
                              """ix"": " & Intensity

                    If colorArray <> "" Then
                        Payload &= ",""col"": [" & colorArray & "]"
                    End If

                    Payload &= "}" &
                              "]" &
                              "}"
                End If
            End If
        End If

        If wledIp <> "" AndAlso Payload <> "" Then
            Dim content As New StringContent(Payload, Encoding.UTF8, "application/json")
            SendJsonToWLED2(wledIp, content)
        End If
    End Sub


    Public Async Function SetSegmentsFromGridAsync(ByVal DG_Devices As DataGridView) As Task

        For Each devRow As DataGridViewRow In DG_Devices.Rows
            If devRow.IsNewRow Then Continue For

            Dim ip = Convert.ToString(devRow.Cells("colIPAddress").Value)
            Dim segmentsStr = Convert.ToString(devRow.Cells("colSegments").Value)
            If String.IsNullOrWhiteSpace(ip) OrElse String.IsNullOrWhiteSpace(segmentsStr) Then Continue For

            Dim segmentsList As New List(Of JObject)
            Dim matches = System.Text.RegularExpressions.Regex.Matches(segmentsStr, "\((\d+)-(\d+)\)")
            Dim segId As Integer = 0

            For Each m As System.Text.RegularExpressions.Match In matches
                Dim startLed = Integer.Parse(m.Groups(1).Value)
                Dim stopLed = Integer.Parse(m.Groups(2).Value)
                Dim segObj As New JObject From {
                    {"id", segId},
                    {"start", startLed},
                    {"stop", stopLed}
                }
                segmentsList.Add(segObj)
                segId += 1
            Next

            If segmentsList.Count > 0 Then
                Dim payload As New JObject From {
                    {"seg", JArray.FromObject(segmentsList)}
                }
                Try
                    Using client As New HttpClient()
                        client.Timeout = TimeSpan.FromSeconds(3)
                        Dim content As New StringContent(payload.ToString(), Encoding.UTF8, "application/json")
                        Dim response = Await client.PostAsync($"http://{ip}/json/state", content)
                        If Not response.IsSuccessStatusCode Then
                            ToonFlashBericht($"[WLED] Device gaf een foutmelding bij {ip}: {response.StatusCode}", 5, FlashSeverity.IsError)
                            devRow.Cells("colOnline").Value = My.Resources.iconRedBullet1
                        End If
                    End Using
                Catch ex As TaskCanceledException
                    ToonFlashBericht($"[WLED] Timeout bij {ip}.", 5, FlashSeverity.IsWarning)
                    'devRow.Cells("colOnline").Value = My.Resources.iconRedBullet1
                Catch ex As HttpRequestException
                    ToonFlashBericht($"[WLED] Device offline of netwerkfout bij {ip}: {ex.Message}", 5, FlashSeverity.IsError)
                    'devRow.Cells("colOnline").Value = My.Resources.iconRedBullet1


                Catch ex As Exception
                    ToonFlashBericht($"[WLED] Onverwachte fout bij {ip}: {ex.Message}", 5, FlashSeverity.IsError)
                    'devRow.Cells("colOnline").Value = My.Resources.iconRedBullet1
                End Try
            End If
        Next
    End Function

    Public Sub ResetProcessedCheckboxes(DG_Show As DataGridView)
        For Each row As DataGridViewRow In DG_Show.Rows
            If Not row.IsNewRow Then
                row.Cells("colSend").Value = "False"
            End If
        Next
    End Sub



    Public Async Sub SendInstructionSetForDevice(DG_Show As DataGridView, primaryRow As DataGridViewRow)
        'If DG_Show.CurrentCell Is Nothing OrElse DG_Show.CurrentRow Is Nothing OrElse DG_Show.CurrentRow.IsNewRow Then Exit Sub

        ' Get primary row and its key values
        Dim act = primaryRow.Cells("colAct").Value?.ToString()
        Dim scene = primaryRow.Cells("colSceneId").Value?.ToString()
        Dim eventNr = primaryRow.Cells("colEventId").Value?.ToString()
        Dim fixture = primaryRow.Cells("colFixture").Value?.ToString()
        If String.IsNullOrEmpty(fixture) OrElse fixture.StartsWith("**") Then Exit Sub

        Dim wledName = fixture.Split("/"c)(0)
        Dim wledIp As String = Nothing

        ' Find the IP for this WLED device
        For Each devRow As DataGridViewRow In FrmMain.DG_Devices.Rows
            If devRow.IsNewRow Then Continue For
            If devRow.Cells("colInstance").Value?.ToString() = wledName Then
                wledIp = devRow.Cells("colIPAddress").Value?.ToString()
                Exit For
            End If
        Next
        If String.IsNullOrEmpty(wledIp) Then Exit Sub

        ' Collect all rows for this device and matching act/scene/event
        Dim segmentList As New List(Of JObject)
        For Each row As DataGridViewRow In DG_Show.Rows
            If row.IsNewRow Then Continue For
            Dim rowFixture = row.Cells("colFixture").Value?.ToString()
            If String.IsNullOrEmpty(rowFixture) OrElse rowFixture.StartsWith("**") Then Continue For
            Dim rowWledName = rowFixture.Split("/"c)(0)
            If rowWledName <> wledName Then Continue For
            If row.Cells("colAct").Value?.ToString() = act AndAlso
               row.Cells("colSceneId").Value?.ToString() = scene AndAlso
               row.Cells("colEventId").Value?.ToString() = eventNr Then

                Dim segId As Integer
                If Not Integer.TryParse(rowFixture.Split("/"c).ElementAtOrDefault(1), segId) Then Continue For

                Dim stateOnOff = row.Cells("colStateOnOff").Value?.ToString()
                stateOnOff = If(stateOnOff = "Uit", "false", "true")
                Dim effectName = row.Cells("colEffect").Value?.ToString()
                Dim effectId = GetEffectIdFromName(effectName, FrmMain.DG_Effecten)
                Dim paletteName = row.Cells("colPalette").Value?.ToString()
                Dim paletteId = GetPaletteIdFromName(paletteName, FrmMain.DG_Paletten)
                Dim brightness = row.Cells("colBrightness").Value?.ToString()
                Dim speed = row.Cells("colSpeed").Value?.ToString()
                Dim intensity = row.Cells("colIntensity").Value?.ToString()

                Dim segObj As New JObject From {
                    {"id", segId},
                    {"on", Boolean.Parse(stateOnOff)},
                    {"fx", effectId},
                    {"pal", paletteId},
                    {"sel", True},
                    {"bri", If(String.IsNullOrEmpty(brightness), 255, Integer.Parse(brightness))},
                    {"sx", If(String.IsNullOrEmpty(speed), 127, Integer.Parse(speed))},
                    {"ix", If(String.IsNullOrEmpty(intensity), 127, Integer.Parse(intensity))}
                }
                segmentList.Add(segObj)

                ' Mark this row as processed (corrected)
                If DG_Show.Columns.Contains("colSend") Then
                    row.Cells("colSend").Value = True
                End If
            End If
        Next

        If segmentList.Count = 0 Then Exit Sub

        ' Build the instruction set and send to WLED
        Dim payload As New JObject From {
            {"seg", JArray.FromObject(segmentList)}
        }
        Try
            Using client As New HttpClient()
                client.Timeout = TimeSpan.FromSeconds(3)
                Dim content As New StringContent(payload.ToString(), Encoding.UTF8, "application/json")
                Dim response = Await client.PostAsync($"http://{wledIp}/json/state", content)
                If response.IsSuccessStatusCode Then
                    'ToonFlashBericht($"[WLED] Instructieset verzonden naar {wledName} ({wledIp})", 1)
                Else
                    ToonFlashBericht($"[WLED] Fout bij verzenden instructieset naar {wledName}: {response.StatusCode}", 5, FlashSeverity.IsError)
                End If
            End Using
        Catch ex As Exception
            ToonFlashBericht($"[WLED] Fout bij verzenden instructieset naar {wledName}: {ex.Message}", 5, FlashSeverity.IsError)
        End Try
    End Sub


End Module

Imports System.Net
Imports System.Net.Http
Imports System.Windows.Forms.VisualStyles
Imports Newtonsoft.Json.Linq

' ------------------------------------------
' Form voor voortgang tijdens netwerkscans
' ------------------------------------------
Public Class frmScanStatus
    Inherits Form

    Public ProgressBar1 As New ProgressBar() With {
        .Dock = DockStyle.Bottom,
        .Height = 30
    }
    Public lblStatus As New Label() With {
        .Dock = DockStyle.Top,
        .Height = 30,
        .TextAlign = ContentAlignment.Center,
        .Text = "Start scan..."
    }
    Public lblFound As New Label() With {
        .Dock = DockStyle.Top,
        .Height = 30,
        .TextAlign = ContentAlignment.Center,
        .Text = "Gevonden: 0"
    }

    Public Sub New(maxValue As Integer)
        Me.Text = "WLED Netwerkscan"
        Me.Width = 450
        Me.Height = 160
        Me.FormBorderStyle = FormBorderStyle.FixedDialog
        Me.ControlBox = False
        Me.StartPosition = FormStartPosition.CenterParent

        ProgressBar1.Minimum = 0
        ProgressBar1.Maximum = maxValue
        ProgressBar1.Value = 0

        Me.Controls.Add(ProgressBar1)
        Me.Controls.Add(lblFound)
        Me.Controls.Add(lblStatus)
    End Sub

    Public Sub UpdateProgress(current As Integer, ip As String, foundCount As Integer)
        If current <= ProgressBar1.Maximum Then
            ProgressBar1.Value = current
            lblStatus.Text = $"Scannen {ip} ({current}/{ProgressBar1.Maximum})"
            lblFound.Text = $"Gevonden: {foundCount}"
            Application.DoEvents()
        End If
    End Sub
End Class

' -----------------------------
' Network Scanning Module
' -----------------------------
Module PopUp_NetworkScanner

    Private Const PerIpTimeoutMs As Integer = 300

    ''' <summary>
    ''' Volledige netwerkscan: zoekt WLED devices, vult alle kolommen inclusief naam, IP, leds en layout.
    ''' </summary>
    Public Async Function ScanNetworkForWLEDDevices(dg As DataGridView) As Task

        Dim ipRange = My.Settings.IPRange
        Dim parts = ipRange.Split("/"c)
        Dim baseIp = parts(0)
        Dim subnetBits = If(parts.Length > 1, Integer.Parse(parts(1)), 24)

        Dim baseBytes = IPAddress.Parse(baseIp).GetAddressBytes()
        Dim baseInt As UInteger = CUInt(baseBytes(0)) << 24 Or CUInt(baseBytes(1)) << 16 Or CUInt(baseBytes(2)) << 8 Or CUInt(baseBytes(3))
        Dim total As Integer = CInt(Math.Pow(2, 32 - subnetBits))


        Dim client As New HttpClient()

        client.Timeout = TimeSpan.FromMilliseconds(PerIpTimeoutMs)

        Using popup As New frmScanStatus(total)
            popup.Show(dg.FindForm())
            Dim foundCount As Integer = 0

            For i As Integer = 0 To total - 1
                Dim ipInt = baseInt + CUInt(i)
                Dim bytes = {
                    CByte(ipInt >> 24),
                    CByte((ipInt >> 16) And 255),
                    CByte((ipInt >> 8) And 255),
                    CByte(ipInt And 255)
                }
                Dim ipStr = New IPAddress(bytes).ToString()

                ' Update voortgang
                popup.UpdateProgress(i + 1, ipStr, foundCount)

                Try
                    Dim res = Await client.GetAsync($"http://{ipStr}/json")
                    If res.IsSuccessStatusCode Then
                        ' We got a valid WLED response, retrieve the JSON data

                        Dim body = Await res.Content.ReadAsStringAsync()
                        Dim json = JObject.Parse(body)
                        Dim name = json("info")("name").ToString()
                        Dim ledCount = If(json("info")("leds")("count")?.ToObject(Of Integer)(), 0)
                        Dim segCount = If(json("state")("seg")?.Count(), 0)
                        Dim effectString As String = JsonToCommaSeparatedString(json("effects").ToString)
                        Dim paletteString As String = JsonToCommaSeparatedString(json("palettes").ToString)

                        ' Build the colSegments string
                        Dim segments = json("state")("seg")
                        Dim segStrings As New List(Of String)
                        For Each seg In segments
                            Dim startVal = seg("start")?.ToObject(Of Integer)()
                            Dim stopVal = seg("stop")?.ToObject(Of Integer)()
                            If startVal IsNot Nothing AndAlso stopVal IsNot Nothing Then
                                segStrings.Add($"({startVal}-{stopVal})")
                            End If
                        Next
                        Dim segSummary = String.Join("", segStrings)

                        ' Gather the full segment data as JSON string for colSegmentsData
                        Dim segmentsDataString As String = ""
                        If segments IsNot Nothing Then
                            segmentsDataString = segments.ToString(Newtonsoft.Json.Formatting.None)
                        End If

                        ' UI-thread update
                        dg.Invoke(Sub()

                                      Dim existing = dg.Rows.Cast(Of DataGridViewRow)() _
                                          .FirstOrDefault(Function(r) Convert.ToString(r.Cells("colInstance").Value) = name)

                                      If existing Is Nothing Then
                                          Dim idx = dg.Rows.Add()
                                          Dim row = dg.Rows(idx)
                                          row.Cells("colInstance").Value = name
                                          row.Cells("colIPAddress").Value = ipStr
                                          row.Cells("colLedCount").Value = ledCount
                                          row.Cells("colSegments").Value = segSummary
                                          row.Cells("colSegmentsData").Value = segmentsDataString
                                          row.Cells("colEnabled").Value = True
                                          row.Cells("colOnline").Value = My.Resources.iconRedBullet1
                                          row.Cells("colLayout").Value = GenerateDefaultLayout(ledCount, segSummary)
                                          row.Cells("colEffects").Value = effectString
                                          row.Cells("colPalettes").Value = paletteString
                                      Else
                                          existing.Cells("colIPAddress").Value = ipStr
                                          existing.Cells("colSegments").Value = segSummary
                                          existing.Cells("colSegmentsData").Value = segmentsDataString
                                          existing.Cells("colEffects").Value = effectString
                                          existing.Cells("colPalettes").Value = paletteString
                                          existing.Cells("colLayout").Value = GenerateDefaultLayout(ledCount, segSummary)
                                      End If
                                  End Sub)

                        ' Set all LEDs to green

                        Try
                            ledCount = If(json("info")("leds")("count")?.ToObject(Of Integer)(), 0)
                            Try
                                Dim totalLeds As Integer = If(json("info")("leds")("count")?.ToObject(Of Integer)(), 0)
                                If totalLeds > 0 Then
                                    Dim greenPayload As String =
                                        "{" &
                                        """seg"":[{""id"":0,""start"":0,""stop"":" & totalLeds.ToString() & ",""col"":[[0,255,0]]}]" &
                                        "}"
                                    Dim greenContent As New StringContent(greenPayload, System.Text.Encoding.UTF8, "application/json")
                                    Await client.PostAsync($"http://{ipStr}/json/state", greenContent)
                                End If
                            Catch ex As Exception
                                ' Optionally log or ignore errors here
                            End Try
                            If ledCount > 0 Then
                                Dim greenPayload As String =
                                    "{" &
                                    """seg"":[{""id"":0,""start"":0,""stop"":" & ledCount.ToString() & ",""col"":[[0,255,0]]}]" &
                                    "}"
                                Dim greenContent As New StringContent(greenPayload, System.Text.Encoding.UTF8, "application/json")
                                Await client.PostAsync($"http://{ipStr}/json/state", greenContent)
                            End If
                        Catch ex As Exception
                            ' Optionally log or ignore errors here
                        End Try

                        foundCount += 1
                    End If
                Catch
                    ' Timeouts en niet-WLED negeren
                End Try
            Next

            popup.Close()
        End Using
    End Function

    ' Converts a JSON array of effects to a single comma-separated string.
    Private Function JsonToCommaSeparatedString(JsonString As String) As String
        Dim MyList As IEnumerable(Of String)
        Try
            Dim cleanJson = JsonString.Replace(vbCrLf, "").Replace(vbTab, "")
            MyList = Newtonsoft.Json.JsonConvert.DeserializeObject(Of List(Of String))(cleanJson)
        Catch
            Dim trimmed = JsonString.Trim("["c, "]"c, " "c, vbCr, vbLf)
            MyList = trimmed.Split({","}, StringSplitOptions.RemoveEmptyEntries).
            Select(Function(s) s.Trim().Trim(""""c))
        End Try
        Return String.Join(",", MyList)
    End Function


    ''' <summary>
    ''' Alleen IP-update scan: voor bestaande DG rows update IP-kolom op basis van instance-naam.
    ''' </summary>
    Public Async Function RefreshIPAddresses(dg As DataGridView) As Task
        Dim ipRange = My.Settings.IPRange
        Dim parts = ipRange.Split("/"c)
        Dim baseIp = parts(0)
        Dim subnetBits = If(parts.Length > 1, Integer.Parse(parts(1)), 24)

        Dim baseBytes = IPAddress.Parse(baseIp).GetAddressBytes()
        Dim baseInt As UInteger = CUInt(baseBytes(0)) << 24 Or CUInt(baseBytes(1)) << 16 Or CUInt(baseBytes(2)) << 8 Or CUInt(baseBytes(3))
        Dim total As Integer = CInt(Math.Pow(2, 32 - subnetBits))

        Dim client As New HttpClient()

        client.Timeout = TimeSpan.FromMilliseconds(PerIpTimeoutMs)

        Using popup As New frmScanStatus(total)
            popup.Show(dg.FindForm())
            Dim updatedCount As Integer = 0

            For i As Integer = 0 To total - 1
                Dim ipInt = baseInt + CUInt(i)
                Dim bytes = {
                    CByte(ipInt >> 24),
                    CByte((ipInt >> 16) And 255),
                    CByte((ipInt >> 8) And 255),
                    CByte(ipInt And 255)
                }
                Dim ipStr = New IPAddress(bytes).ToString()

                popup.UpdateProgress(i + 1, ipStr, updatedCount)

                Try
                    Dim res = Await client.GetAsync($"http://{ipStr}/json")
                    If res.IsSuccessStatusCode Then
                        Dim body = Await res.Content.ReadAsStringAsync()
                        Dim json = JObject.Parse(body)
                        Dim name = json("info")("name").ToString()

                        ' Alleen IP updaten
                        dg.Invoke(Sub()
                                      For Each row As DataGridViewRow In dg.Rows
                                          If row.IsNewRow Then Continue For
                                          If Convert.ToString(row.Cells("colInstance").Value) = name Then
                                              row.Cells("colIPAddress").Value = ipStr
                                              updatedCount += 1
                                              Exit For
                                          End If
                                      Next
                                  End Sub)
                    End If
                Catch
                    ' Negeer fouten
                End Try
            Next

            popup.Close()
        End Using
    End Function

    ''' <summary>
    ''' Generieke layout generator voor nieuw gevonden WLED devices.
    ''' </summary>
    Private Function GenerateDefaultLayout(ledCount As Integer, segmentSummary As String) As String
        ' Start at Y10,X10
        Dim layout As New List(Of String)
        layout.Add("Y10")
        layout.Add("X10")

        If String.IsNullOrWhiteSpace(segmentSummary) Then
            layout.Add($"R{ledCount}")
            Return String.Join(",", layout)
        End If

        ' Parse segments: (start-stop)(start-stop)...
        Dim segMatches = System.Text.RegularExpressions.Regex.Matches(segmentSummary, "\((\d+)-(\d+)\)")
        Dim y As Integer = 10

        For i As Integer = 0 To segMatches.Count - 1
            Dim startVal = Integer.Parse(segMatches(i).Groups(1).Value)
            Dim stopVal = Integer.Parse(segMatches(i).Groups(2).Value)
            Dim segLen = stopVal - startVal ' The stop led is not included in the segment.

            If i > 0 Then
                y += 10
                layout.Add($"Y+10")
            End If
            layout.Add($"R{segLen}")
        Next

        Return String.Join(",", layout)
    End Function
End Module

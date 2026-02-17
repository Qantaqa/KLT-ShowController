Imports System.Net
Imports System.Net.Sockets
Imports System.Text

Module WizControl
    Private Const WizPort As Integer = 38899
    Private Const TimeoutMs As Integer = 1000 ' 1 seconde wachten op antwoord

    ''' <summary>
    ''' Zet de WiZ lamp aan
    ''' </summary>
    Public Async Sub WizZetAan(ipAdres As String)
        Dim json As String = "{""id"":1,""method"":""setState"",""params"":{""state"":true}}"
        Await VerzendWizCommando(ipAdres, json, "Aanzetten")
    End Sub

    ''' <summary>
    ''' Zet de WiZ lamp uit
    ''' </summary>
    Public Async Sub WizZetUit(ipAdres As String)
        Dim json As String = "{""id"":1,""method"":""setState"",""params"":{""state"":false}}"
        Await VerzendWizCommando(ipAdres, json, "Uitzetten")
    End Sub

    ''' <summary>
    ''' Past kleur en helderheid aan. Dimming wordt beperkt tussen 10 en 100 voor hardware veiligheid.
    ''' </summary>
    Public Async Sub WizStelKleurIn(ipAdres As String, r As Integer, g As Integer, b As Integer, dimming As Integer)
        ' Validatie van de dimming range conform WiZ specificaties
        If dimming < 10 Then dimming = 10
        If dimming > 100 Then dimming = 100

        ' Gebruik String.Format met dubbele accolades om JSON correct en veilig samen te stellen
        Dim formattedJson As String = String.Format("{{""id"":1,""method"":""setPilot"",""params"":{{""r"":{0},""g"":{1},""b"":{2},""dimming"":{3}}}}}", r, g, b, dimming)

        Await VerzendWizCommando(ipAdres, formattedJson, "Kleur aanpassen")
    End Sub

    ''' <summary>
    ''' Haalt de huidige status op van de lamp
    ''' </summary>
    Public Async Function WizHaalStatusOp(ipAdres As String) As Task(Of String)
        Dim json As String = "{""method"":""getPilot"",""params"":{}}"
        Return Await VerzendWizCommando(ipAdres, json, "Status ophalen", True)
    End Function

    ''' <summary>
    ''' De centrale robuuste afhandeling van het UDP verkeer
    ''' </summary>
    Private Async Function VerzendWizCommando(ip As String, payload As String, actieNaam As String, Optional verwachtAntwoord As Boolean = False) As Task(Of String)
        Dim resultaat As String = ""

        Try
            ' Basic IP validation
            Dim parsedIp As IPAddress = Nothing
            If Not IPAddress.TryParse(ip, parsedIp) Then
                ToonFlashBericht($"Ongeldig IP-adres voor WiZ: {ip}", 5, FlashSeverity.IsError)
                Return ""
            End If

            Using client As New UdpClient()
                ' Stel timeouts in zodat de software niet blijft hangen
                client.Client.SendTimeout = TimeoutMs
                client.Client.ReceiveTimeout = TimeoutMs

                Dim data As Byte() = Encoding.ASCII.GetBytes(payload)
                Dim eindPunt As New IPEndPoint(parsedIp, WizPort)

                ' Verzenden
                Await client.SendAsync(data, data.Length, eindPunt)

                If verwachtAntwoord Then
                    ' Wachten op antwoord (met een timeout task om bevriezing te voorkomen)
                    Dim receiveTask As Task(Of UdpReceiveResult) = client.ReceiveAsync()
                    Dim finishedTask As Task = Await Task.WhenAny(receiveTask, Task.Delay(TimeoutMs))

                    If finishedTask Is receiveTask Then
                        ' receiveTask voltooid — await to get the result
                        Dim response = Await receiveTask
                        resultaat = Encoding.ASCII.GetString(response.Buffer)
                    Else
                        ToonFlashBericht($"Timeout bij ontvangen van antwoord van {ip} ({actieNaam})", 4, FlashSeverity.IsWarning)
                        Return ""
                    End If
                End If
            End Using
        Catch ex As Exception
            ' Foutafhandeling via jouw bestaande FlashBericht systeem
            ToonFlashBericht($"WiZ Fout ({actieNaam}) op {ip}: {ex.Message}", 5, FlashSeverity.IsError)
            Return ""
        End Try

        Return resultaat
    End Function
End Module




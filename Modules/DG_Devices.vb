Imports System.Net
Imports System.Net.Http
Imports System.Net.NetworkInformation
Imports System.Threading
Imports System.Threading.Tasks
Imports Newtonsoft.Json
Imports Newtonsoft.Json.Linq
Imports System.Windows.Forms


Module DG_Devices

    ' Zet alle apparaten in DG_Devices op offline (rode bullet).
    Public Sub SetAllDevicesOffline(ByVal DG_Devices As DataGridView)
        If DG_Devices Is Nothing OrElse DG_Devices.Columns.Count = 0 OrElse
       Not DG_Devices.Columns.Contains("colOnline") Then
            Exit Sub
        End If

        For Each row As DataGridViewRow In DG_Devices.Rows
            If row IsNot Nothing AndAlso Not row.IsNewRow Then
                Dim onlineCell As DataGridViewImageCell = TryCast(row.Cells("colOnline"), DataGridViewImageCell)
                If onlineCell IsNot Nothing Then
                    onlineCell.Value = My.Resources.iconRedBullet1
                End If
            End If
        Next
    End Sub

    ' ****************************************************************************************
    '  Opent de WLED-website in de standaardbrowser.
    ' ****************************************************************************************
    Public Sub OpenWebsiteOfWLED(DG_Devices As DataGridView, txt_APIResult As TextBox, e As DataGridViewCellEventArgs)
        If e.RowIndex < 0 Then Exit Sub ' Zorg ervoor dat er niet op de header is geklikt.

        Try
            ' Haal het IP-adres op van de geselecteerde rij.
            Dim ipAddress As String = Convert.ToString(DG_Devices.Rows(e.RowIndex).Cells("colIPAddress").Value)

            ' Controleer of het IP-adres geldig is.
            If Not String.IsNullOrEmpty(ipAddress) Then
                ' Open de WLED-website in de standaardbrowser.
                Process.Start(New ProcessStartInfo($"http://{ipAddress}") With {.UseShellExecute = True})
            Else
                txt_APIResult.Text = "Ongeldig IP-adres."
            End If

        Catch ex As Exception
            txt_APIResult.Text = "Fout bij het openen van de browser: " & ex.Message
        End Try
    End Sub



    ' ****************************************************************************************
    '  Doorzoek de grid DG_Devices op naam en geef een IP-adres terug.
    ' ****************************************************************************************
    Public Function GetIpFromWLedName(SearchName As String) As String
        ' Zoek de IP-adres in de DG_Devices DataGridView.
        For Each deviceRow As DataGridViewRow In FrmMain.DG_Devices.Rows()
            Dim deviceNameCellValue = deviceRow.Cells("colInstance").Value
            Dim deviceIpCellValue = deviceRow.Cells("colIPAddress").Value
            If deviceNameCellValue IsNot Nothing AndAlso deviceNameCellValue.ToString() = SearchName Then
                If deviceIpCellValue IsNot Nothing Then
                    Return deviceIpCellValue.ToString()
                Else
                    Return ""
                End If
            End If
        Next

        Return "Unknown DeviceName"
    End Function


    ' ****************************************************************************************
    '  Do een check op WLED online status.
    ' ****************************************************************************************
    Public Function CheckWLEDOnlineStatus(ByVal DG_Devices As DataGridView) As Integer
        Dim NrOfFails As Integer = 0

        ' Zorg ervoor dat de DataGridView niet leeg is en de verwachte kolommen bevat.
        If DG_Devices Is Nothing OrElse DG_Devices.Columns.Count = 0 OrElse
           Not DG_Devices.Columns.Contains("colIPAddress") OrElse
           Not DG_Devices.Columns.Contains("colInstance") OrElse
           Not DG_Devices.Columns.Contains("colOnline") Then
            ' Verlaat de sub als de DataGridView ongeldig is.
            Return -1
        End If

        ' Loop door elke rij in de DataGridView.
        For Each row As DataGridViewRow In DG_Devices.Rows
            If row.Cells("colEnabled").Value = False Then Continue For


            ' Controleer of de rij geldig is en de benodigde cellen niet Nothing zijn.
            If row IsNot Nothing AndAlso
               row.Cells("colIPAddress")?.Value IsNot Nothing AndAlso
               row.Cells("colInstance")?.Value IsNot Nothing Then

                Dim ipAddress As String = row.Cells("colIPAddress").Value.ToString()
                Dim instance As String = row.Cells("colInstance").Value.ToString()
                Dim onlineCell As DataGridViewImageCell = TryCast(row.Cells("colOnline"), DataGridViewImageCell)

                ' Controleer of de cast naar DataGridViewImageCell succesvol was.
                If onlineCell IsNot Nothing Then
                    ' Ping het IP-adres om de online status te controleren.
                    Dim isOnline As Boolean = PingWLED(ipAddress)

                    ' Stel de juiste afbeelding in op basis van de online status.
                    If isOnline Then
                        onlineCell.Value = My.Resources.iconGreenBullet1 ' Stel de groene bullet in.
                    Else
                        onlineCell.Value = My.Resources.iconRedBullet1   ' Stel de rode bullet in.
                        NrOfFails = NrOfFails + 1
                    End If
                End If
            End If
        Next
        Return NrOfFails
    End Function

    ' ****************************************************************************************
    ' Functie om een IP-adres van een WLED/Devices te pingen.
    ' ****************************************************************************************
    Private Function PingWLED(ByVal ipAddress As String) As Boolean
        Try
            Using ping As New Ping()
                Dim reply As PingReply = ping.Send(ipAddress, 1000) ' Timeout van 1 seconde.
                Return (reply.Status = IPStatus.Success)
            End Using
        Catch ex As PingException
            ' Log de fout en retourneer false.
            Console.WriteLine($"PingException voor {ipAddress}: {ex.Message}")
            Return False
        Catch ex As Exception
            ' Algemene foutafhandeling voor andere exceptions.
            Console.WriteLine($"Fout bij pingen van {ipAddress}: {ex.Message}")
            Return False
        End Try
    End Function


    ' *********************************************************
    ' Add Row AFTER
    ' *********************************************************
    Public Sub DG_Devices_AddNewRowAfter_Click(ByVal DG_Devices As DataGridView, DG_Show As DataGridView, DG_Groups As DataGridView)
        'Voeg hier de logica toe om een nieuwe rij na de huidige rij toe te voegen
        Dim currentRowIndex As Integer = 0

        If DG_Devices.Rows.Count > 0 Then
            currentRowIndex = DG_Devices.CurrentCell.RowIndex
            DG_Devices.Rows.Insert(currentRowIndex + 1, 1) 'Voegt een nieuwe rij in na de huidige rij
        Else
            DG_Devices.Rows.Insert(0, 1) 'Voegt een nieuwe rij in op de gespecificeerde index
            currentRowIndex = -1
        End If


        'Stel de focus op de nieuwe rij
        DG_Devices.CurrentCell = DG_Devices.Rows(currentRowIndex + 1).Cells(0)

        UpdateFixuresPulldown_ForShow(DG_Show)
        PopulateFixtureDropdown_InGroups(DG_Devices, DG_Groups)
    End Sub

    ' *********************************************************
    ' REMOVE Row
    ' *********************************************************
    Public Sub DG_Devices_RemoveCurrentRow_Click(ByVal DG_Devices As DataGridView)

        'Voeg hier de logica toe om de huidige rij te verwijderen
        Dim currentRowIndex As Integer = DG_Devices.CurrentCell.RowIndex
        If DG_Devices.Rows.Count > 0 Then
            DG_Devices.Rows.RemoveAt(currentRowIndex)
        End If
    End Sub


End Module
Imports System.Runtime.InteropServices
Imports System.Windows.Forms

Public Class HotkeyControl
    Inherits NativeWindow
    Implements IDisposable

    Private Const WM_HOTKEY As Integer = &H312
    Private Const MOD_ALT As Integer = &H1
    Private Const MOD_CONTROL As Integer = &H2

    Private ReadOnly _owner As Form
    Private ReadOnly _combo As ComboBox
    Private _disposed As Boolean

    Private Enum HotkeyId
        Output1 = 9001
        Output2 = 9002
        Output3 = 9003
    End Enum

    <DllImport("user32.dll", SetLastError:=True)>
    Private Shared Function RegisterHotKey(hWnd As IntPtr, id As Integer, fsModifiers As Integer, vk As UInteger) As Boolean
    End Function

    <DllImport("user32.dll", SetLastError:=True)>
    Private Shared Function UnregisterHotKey(hWnd As IntPtr, id As Integer) As Boolean
    End Function

    Public Sub New(owner As Form, monitorCombo As ComboBox)
        _owner = owner
        _combo = monitorCombo

        AddHandler _owner.HandleCreated, AddressOf Owner_HandleCreated
        AddHandler _owner.HandleDestroyed, AddressOf Owner_HandleDestroyed

        If _owner.IsHandleCreated Then
            AssignHandle(_owner.Handle)
            RegisterOutputHotkeys()
        End If
    End Sub

    Private Sub Owner_HandleCreated(sender As Object, e As EventArgs)
        AssignHandle(_owner.Handle)
        RegisterOutputHotkeys()
    End Sub

    Private Sub Owner_HandleDestroyed(sender As Object, e As EventArgs)
        UnregisterOutputHotkeys()
        ReleaseHandle()
    End Sub

    Public Sub RegisterOutputHotkeys()
        If Handle = IntPtr.Zero Then Return

        Dim ok As Boolean = True
        ok = ok AndAlso RegisterHotKey(Handle, CInt(HotkeyId.Output1), MOD_CONTROL Or MOD_ALT, CUInt(Keys.D1))
        ok = ok AndAlso RegisterHotKey(Handle, CInt(HotkeyId.Output2), MOD_CONTROL Or MOD_ALT, CUInt(Keys.D2))
        ok = ok AndAlso RegisterHotKey(Handle, CInt(HotkeyId.Output3), MOD_CONTROL Or MOD_ALT, CUInt(Keys.D3))

        ' Optioneel: NumPad 1/2/3
        RegisterHotKey(Handle, CInt(HotkeyId.Output1) + 100, MOD_CONTROL Or MOD_ALT, CUInt(Keys.NumPad1))
        RegisterHotKey(Handle, CInt(HotkeyId.Output2) + 100, MOD_CONTROL Or MOD_ALT, CUInt(Keys.NumPad2))
        RegisterHotKey(Handle, CInt(HotkeyId.Output3) + 100, MOD_CONTROL Or MOD_ALT, CUInt(Keys.NumPad3))

        If Not ok Then
            Try
                MessageBox.Show("Registering hotkeys (Ctrl+Alt+1/2/3) failed. They might be in use by another app.", "Hotkeys", MessageBoxButtons.OK, MessageBoxIcon.Warning)
            Catch
            End Try
        End If
    End Sub

    Private Sub UnregisterOutputHotkeys()
        If Handle = IntPtr.Zero Then Return

        UnregisterHotKey(Handle, CInt(HotkeyId.Output1))
        UnregisterHotKey(Handle, CInt(HotkeyId.Output2))
        UnregisterHotKey(Handle, CInt(HotkeyId.Output3))
        UnregisterHotKey(Handle, CInt(HotkeyId.Output1) + 100)
        UnregisterHotKey(Handle, CInt(HotkeyId.Output2) + 100)
        UnregisterHotKey(Handle, CInt(HotkeyId.Output3) + 100)
    End Sub

    Protected Overrides Sub WndProc(ByRef m As Message)
        If m.Msg = WM_HOTKEY Then
            Dim id As Integer = m.WParam.ToInt32()
            Select Case id
                Case CInt(HotkeyId.Output1), CInt(HotkeyId.Output1) + 100
                    SelectMonitorOutput(0) ' Output 1
                Case CInt(HotkeyId.Output2), CInt(HotkeyId.Output2) + 100
                    SelectMonitorOutput(1) ' Output 2
                Case CInt(HotkeyId.Output3), CInt(HotkeyId.Output3) + 100
                    SelectMonitorOutput(2) ' Output 3
            End Select
        End If
        MyBase.WndProc(m)
    End Sub

    Private Sub SelectMonitorOutput(index As Integer)
        If _combo Is Nothing OrElse _combo.IsDisposed Then Return

        If _combo.InvokeRequired Then
            _combo.BeginInvoke(Sub() SelectMonitorOutput(index))
            Return
        End If

        ' Eerst op index proberen
        If index >= 0 AndAlso index < _combo.Items.Count Then
            _combo.SelectedIndex = index
            Return
        End If

        ' Vallen terug naar tekst "Output 1/2/3"
        Dim targetText As String = "Output " & (index + 1).ToString()
        For i As Integer = 0 To _combo.Items.Count - 1
            Dim it = _combo.Items(i)
            If it IsNot Nothing AndAlso String.Equals(it.ToString(), targetText, StringComparison.OrdinalIgnoreCase) Then
                _combo.SelectedIndex = i
                Exit For
            End If
        Next
    End Sub

    Protected Overridable Sub Dispose(disposing As Boolean)
        If Not _disposed Then
            If disposing Then
                ' managed
            End If
            Try
                UnregisterOutputHotkeys()
            Catch
            End Try
            ReleaseHandle()
            If _owner IsNot Nothing Then
                RemoveHandler _owner.HandleCreated, AddressOf Owner_HandleCreated
                RemoveHandler _owner.HandleDestroyed, AddressOf Owner_HandleDestroyed
            End If
            _disposed = True
        End If
    End Sub

    Public Sub Dispose() Implements IDisposable.Dispose
        Dispose(True)
        GC.SuppressFinalize(Me)
    End Sub
End Class
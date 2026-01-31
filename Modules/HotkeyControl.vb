Imports System.Runtime.InteropServices
Imports System.Windows.Forms

Public Class HotkeyControl
    Inherits NativeWindow
    Implements IDisposable

    Private Const WM_HOTKEY As Integer = &H312
    Private Const MOD_ALT As Integer = &H1
    Private Const MOD_CONTROL As Integer = &H2
    Private Const MOD_SHIFT As Integer = &H4

    Private ReadOnly _owner As Form
    Private ReadOnly _combo As ComboBox
    Private _disposed As Boolean

    Private Enum HotkeyId
        Output1 = 9001
        Output2 = 9002
        Output3 = 9003

        ' Extra hotkeys for main form buttons
        Start = 9010
        NextScene = 9011
        NextAct = 9012
        NextEvent = 9013
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
        Dim success As Boolean

        ' Ctrl+Alt + 1/2/3
        success = RegisterHotKey(Handle, CInt(HotkeyId.Output1), MOD_CONTROL Or MOD_ALT, CUInt(Keys.D1))
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+1")
        ok = ok And success

        success = RegisterHotKey(Handle, CInt(HotkeyId.Output2), MOD_CONTROL Or MOD_ALT, CUInt(Keys.D2))
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+2")
        ok = ok And success

        success = RegisterHotKey(Handle, CInt(HotkeyId.Output3), MOD_CONTROL Or MOD_ALT, CUInt(Keys.D3))
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+3")
        ok = ok And success

        ' Optional: NumPad 1/2/3
        success = RegisterHotKey(Handle, CInt(HotkeyId.Output1) + 100, MOD_CONTROL Or MOD_ALT, CUInt(Keys.NumPad1))
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+NumPad1")
        ok = ok And success

        success = RegisterHotKey(Handle, CInt(HotkeyId.Output2) + 100, MOD_CONTROL Or MOD_ALT, CUInt(Keys.NumPad2))
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+NumPad2")
        ok = ok And success

        success = RegisterHotKey(Handle, CInt(HotkeyId.Output3) + 100, MOD_CONTROL Or MOD_ALT, CUInt(Keys.NumPad3))
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+NumPad3")
        ok = ok And success

        ' Register Ctrl+Alt+Shift + F1..F4 for main form buttons
        success = RegisterHotKey(Handle, CInt(HotkeyId.Start), MOD_CONTROL Or MOD_ALT Or MOD_SHIFT, CUInt(Keys.F1))       ' Ctrl+Alt+Shift+F1 -> btnControl_Start (was F9)
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+Shift+F1")
        ok = ok And success

        success = RegisterHotKey(Handle, CInt(HotkeyId.NextScene), MOD_CONTROL Or MOD_ALT Or MOD_SHIFT, CUInt(Keys.F3))  ' Ctrl+Alt+Shift+F3 -> btnControl_NextScene (was F10)
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+Shift+F3")
        ok = ok And success

        success = RegisterHotKey(Handle, CInt(HotkeyId.NextAct), MOD_CONTROL Or MOD_ALT Or MOD_SHIFT, CUInt(Keys.F4))    ' Ctrl+Alt+Shift+F4 -> btnControl_NextAct (was F11)
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+Shift+F4")
        ok = ok And success

        success = RegisterHotKey(Handle, CInt(HotkeyId.NextEvent), MOD_CONTROL Or MOD_ALT Or MOD_SHIFT, CUInt(Keys.F2))  ' Ctrl+Alt+Shift+F2 -> btnControl_NextEvent (was F12)
        If Not success Then ReportHotkeyFailure("Ctrl+Alt+Shift+F2")
        ok = ok And success

        If Not ok Then
            ' Existing aggregate warning kept for backward compatibility; detailed messages are shown per-failure above.
            Try
                MessageBox.Show("One or more hotkeys failed to register. See individual messages for details.", "Hotkeys", MessageBoxButtons.OK, MessageBoxIcon.Warning)
            Catch
            End Try
        End If
    End Sub

    Private Sub ReportHotkeyFailure(keyName As String)
        Try
            Dim err As Integer = Marshal.GetLastWin32Error()
            MessageBox.Show(String.Format("Registering hotkey '{0}' failed (Win32 error {1}). It might be in use by another app.", keyName, err), "Hotkeys", MessageBoxButtons.OK, MessageBoxIcon.Warning)
        Catch
            ' Swallow any exceptions while reporting to avoid interfering with hotkey registration flow.
        End Try
    End Sub

    Private Sub UnregisterOutputHotkeys()
        If Handle = IntPtr.Zero Then Return

        UnregisterHotKey(Handle, CInt(HotkeyId.Output1))
        UnregisterHotKey(Handle, CInt(HotkeyId.Output2))
        UnregisterHotKey(Handle, CInt(HotkeyId.Output3))
        UnregisterHotKey(Handle, CInt(HotkeyId.Output1) + 100)
        UnregisterHotKey(Handle, CInt(HotkeyId.Output2) + 100)
        UnregisterHotKey(Handle, CInt(HotkeyId.Output3) + 100)

        ' Unregister function keys
        UnregisterHotKey(Handle, CInt(HotkeyId.Start))
        UnregisterHotKey(Handle, CInt(HotkeyId.NextScene))
        UnregisterHotKey(Handle, CInt(HotkeyId.NextAct))
        UnregisterHotKey(Handle, CInt(HotkeyId.NextEvent))
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

                ' Main form button hotkeys
                Case CInt(HotkeyId.Start)
                    TriggerButtonClick("btnControl_Start")
                Case CInt(HotkeyId.NextScene)
                    TriggerButtonClick("btnControl_NextScene")
                Case CInt(HotkeyId.NextAct)
                    TriggerButtonClick("btnControl_NextAct")
                Case CInt(HotkeyId.NextEvent)
                    TriggerButtonClick("btnControl_NextEvent")
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

    ''' <summary>
    ''' Find the control by name on the main form and invoke its click action.
    ''' Uses BeginInvoke when required and will try PerformClick or call a PerformClick method via reflection.
    ''' </summary>
    Private Sub TriggerButtonClick(controlName As String)
        If _owner Is Nothing OrElse _owner.IsDisposed Then Return

        If _owner.InvokeRequired Then
            _owner.BeginInvoke(Sub() TriggerButtonClick(controlName))
            Return
        End If

        Try
            Dim matches() As Control = _owner.Controls.Find(controlName, True)
            If matches IsNot Nothing AndAlso matches.Length > 0 Then
                Dim ctrl As Control = matches(0)
                If TypeOf ctrl Is Button Then
                    DirectCast(ctrl, Button).PerformClick()
                Else
                    Dim mi = ctrl.GetType().GetMethod("PerformClick")
                    If mi IsNot Nothing Then
                        mi.Invoke(ctrl, Nothing)
                    End If
                End If
            End If
        Catch
            ' Swallow exceptions to avoid breaking hotkey handling
        End Try
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
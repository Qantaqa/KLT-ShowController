import React, { useState, useEffect } from 'react'
import { X, Database, Table as TableIcon, Search, RefreshCw, Layers, Save, Trash2 } from 'lucide-react'
import { cn, modalBtnDanger, modalBtnIconClass, modalBtnPrimary, modalBtnSecondary } from '../lib/utils'
import { useSequencerStore } from '../store/useSequencerStore'

interface DatabaseManagerProps {
    isOpen: boolean
    onClose: () => void
}

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({ isOpen, onClose }) => {
    const { openModal, addToast } = useSequencerStore()
    const [tables, setTables] = useState<string[]>([])
    const [selectedTable, setSelectedTable] = useState<string | null>(null)
    const [tableData, setTableData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [editingRow, setEditingRow] = useState<any>(null)
    const [formData, setFormData] = useState<any>({})

    useEffect(() => {
        if (isOpen) {
            loadTables()
        }
    }, [isOpen])

    const loadTables = async () => {
        if (!(window as any).require) return
        const { ipcRenderer } = (window as any).require('electron')
        try {
            const result = await ipcRenderer.invoke('db:get-tables')
            setTables(result)
        } catch (err) {
            console.error('Failed to load tables', err)
        }
    }

    const loadTableData = async (tableName: string, resetSearch: boolean = false) => {
        setIsLoading(true)
        setSelectedTable(tableName)
        if (resetSearch) setSearchQuery('')

        // Always refresh table list too to ensure we see the latest schema/tables
        loadTables()

        if (!(window as any).require) return
        const { ipcRenderer } = (window as any).require('electron')
        try {
            const result = await ipcRenderer.invoke('db:get-table-data', tableName)
            setTableData(result)
        } catch (err) {
            console.error('Failed to load table data', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleRowClick = (row: any) => {
        setEditingRow(row)
        setFormData({ ...row })
    }

    const handleSave = async () => {
        if (!selectedTable || !editingRow) return
        if (!(window as any).require) return
        const { ipcRenderer } = (window as any).require('electron')

        try {
            await ipcRenderer.invoke('db:update-row', {
                tableName: selectedTable,
                id: editingRow.id,
                data: formData
            })
            setEditingRow(null)
            loadTableData(selectedTable)
            addToast('Rij succesvol bijgewerkt', 'info')
        } catch (e: any) {
            console.error(e)
            addToast('Update mislukt: ' + (e.message || e), 'error')
        }
    }

    const handleDelete = () => {
        if (!selectedTable || !editingRow) return

        openModal({
            title: 'Rij Verwijderen',
            message: 'Weet je zeker dat je deze rij definitief wilt verwijderen?',
            type: 'confirm',
            onConfirm: async () => {
                if (!(window as any).require) return
                const { ipcRenderer } = (window as any).require('electron')

                try {
                    await ipcRenderer.invoke('db:delete-row', {
                        tableName: selectedTable,
                        id: editingRow.id
                    })
                    setEditingRow(null)
                    loadTableData(selectedTable)
                    addToast('Rij succesvol verwijderd', 'info')
                } catch (e: any) {
                    console.error(e)
                    addToast('Delete mislukt: ' + e.message || e, 'error')
                }
            }
        })
    }

    const handleCleanup = () => {
        openModal({
            title: 'Database Schonen',
            message: 'Weet je zeker dat je alle gearchiveerde shows en bijbehorende sequences definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
            type: 'confirm',
            onConfirm: async () => {
                if (!(window as any).require) return
                const { ipcRenderer } = (window as any).require('electron')

                try {
                    const result = await ipcRenderer.invoke('db:cleanup')
                    addToast(`${result.deletedCount} gearchiveerde show(s) en bijbehorende data verwijderd uit database`, 'info')
                    loadTables()
                    if (selectedTable) loadTableData(selectedTable)
                } catch (e: any) {
                    console.error(e)
                    addToast('Schoonmaken mislukt: ' + (e.message || e), 'error')
                }
            }
        })
    }

    if (!isOpen) return null

    const filteredData = tableData.filter(row =>
        Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
    )

    const columns = tableData.length > 0 ? Object.keys(tableData[0]) : []

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass w-full h-full max-w-7xl flex flex-col rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Database className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Database Beheer</h2>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-50">Inspecteer systeem tabellen</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        title="Sluiten"
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar: Tables List */}
                    <aside className="w-64 border-r border-white/10 bg-black/40 flex flex-col">
                        <div className="p-4 border-b border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-2">Tabellen</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {tables.map(table => (
                                <button
                                    key={table}
                                    onClick={() => loadTableData(table, true)}
                                    className={cn(
                                        "w-full px-3 py-2.5 rounded-lg text-left text-xs flex items-center gap-3 transition-all",
                                        selectedTable === table
                                            ? "bg-primary/20 border border-primary/40 text-primary font-bold shadow-lg shadow-primary/10"
                                            : "hover:bg-white/5 text-muted-foreground border border-transparent"
                                    )}
                                >
                                    <TableIcon className={cn("w-3.5 h-3.5", selectedTable === table ? "text-primary" : "text-muted-foreground/40")} />
                                    {table}
                                </button>
                            ))}
                        </div>

                        {/* Sidebar Footer: Cleanup Action */}
                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={handleCleanup}
                                className="w-full px-3 py-2.5 rounded-lg text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                                title="Verwijder gearchiveerde shows definitief"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Schonen
                            </button>
                        </div>
                    </aside>

                    {/* Grid View */}
                    <main className="flex-1 flex flex-col bg-black/60 relative">
                        {!selectedTable ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-20">
                                <Layers className="w-16 h-16 mb-4" />
                                <p className="text-sm font-bold uppercase tracking-[0.2em]">Selecteer een tabel om de data te bekijken</p>
                            </div>
                        ) : (
                            <>
                                {/* Controls */}
                                <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-white/2">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={`Zoek in ${selectedTable}...`}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                                        />
                                    </div>
                                    <button
                                        onClick={() => loadTableData(selectedTable)}
                                        disabled={isLoading}
                                        title="Vernieuwen"
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-white disabled:opacity-20"
                                    >
                                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                                    </button>
                                </div>

                                {/* Data Grid */}
                                <div className="flex-1 overflow-auto custom-scrollbar">
                                    <table className="min-w-full w-max text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white/5 sticky top-0 z-10">
                                                {columns.map(col => (
                                                    <th key={col} className="px-4 py-3 font-black uppercase tracking-widest text-muted-foreground border-b border-white/10 whitespace-nowrap">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground opacity-30 italic">
                                                        Geen data gevonden
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredData.map((row, idx) => (
                                                    <tr key={idx} onClick={() => handleRowClick(row)} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                                        {columns.map(col => (
                                                            <td key={col} className="px-4 py-2 font-mono text-[11px] text-muted-foreground group-hover:text-white whitespace-nowrap">
                                                                {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {isLoading && (
                            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-20">
                                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        )}
                    </main>
                </div>

                {/* Footer */}
                <div className="h-10 border-t border-white/10 px-6 flex items-center justify-between bg-black text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">
                    <span>{selectedTable ? `${filteredData.length} rijen gevonden` : 'Wachtend op selectie'}</span>
                    <span>Antigravity Database Manager V1.0</span>
                </div>
            </div>

            {/* Edit Modal */}
            {
                editingRow && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-12">
                        <div className="glass bg-card w-full max-w-2xl max-h-full flex flex-col rounded-xl shadow-2xl">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="font-bold text-white">Rij Bewerken</h3>
                                <button onClick={() => setEditingRow(null)} title="Sluiten"><X className="w-5 h-5 text-muted-foreground hover:text-white" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {Object.keys(formData).map(key => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-wider">{key}</label>
                                        <input
                                            type="text"
                                            disabled={key === 'id'}
                                            value={typeof formData[key] === 'object' ? JSON.stringify(formData[key]) : formData[key]}
                                            title={key}
                                            placeholder={`Voer ${key} in...`}
                                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                            className={cn(
                                                "w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-primary/50 outline-none font-mono",
                                                key === 'id' && "opacity-50 cursor-not-allowed"
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => setEditingRow(null)} className={modalBtnSecondary()}>
                                        <X className={modalBtnIconClass} />
                                        Annuleren
                                    </button>
                                    <button type="button" onClick={handleDelete} className={modalBtnDanger()}>
                                        <Trash2 className="h-4 w-4 shrink-0 text-red-300" />
                                        Verwijderen
                                    </button>
                                </div>
                                <button type="button" onClick={handleSave} className={modalBtnPrimary()}>
                                    <Save className="h-4 w-4 shrink-0 text-white" />
                                    Opslaan
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

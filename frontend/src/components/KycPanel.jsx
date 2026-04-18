import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Upload, Trash2, Download, FileText, Loader2, ShieldCheck, ShieldAlert, ShieldX, Shield, Clock } from 'lucide-react'
import {
  getKycDocuments, uploadKycDocument, deleteKycDocument,
  updateKycStatus, updateNominee, updateFatca, downloadRiskPdf,
} from '../api/client'

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

const KYC_STATUS_CONFIG = {
  not_started: { label: 'Not Started', bg: 'bg-gray-100', text: 'text-gray-600', icon: Shield },
  in_progress:  { label: 'In Progress',  bg: 'bg-amber-100',  text: 'text-amber-700', icon: Clock },
  submitted:    { label: 'Submitted',    bg: 'bg-blue-100',   text: 'text-blue-700',  icon: ShieldAlert },
  verified:     { label: 'Verified',     bg: 'bg-green-100',  text: 'text-green-700', icon: ShieldCheck },
  expired:      { label: 'Expired',      bg: 'bg-red-100',    text: 'text-red-700',   icon: ShieldX },
}

export function KycStatusBadge({ status }) {
  const cfg = KYC_STATUS_CONFIG[status] || KYC_STATUS_CONFIG.not_started
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

const DOC_SLOTS = [
  { type: 'pan_card',      label: 'PAN Card',      hint: 'Upload PAN card image (JPG, PNG, PDF)' },
  { type: 'aadhaar_front', label: 'Aadhaar Front',  hint: 'Front side of Aadhaar card' },
  { type: 'aadhaar_back',  label: 'Aadhaar Back',   hint: 'Back side of Aadhaar card' },
  { type: 'photo',         label: 'Client Photo',   hint: 'Recent passport-size photograph' },
]

const NOMINEE_RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function buildYears(start = 1940) {
  const years = []
  for (let y = new Date().getFullYear() - 1; y >= start; y--) years.push(y)
  return years
}
const YEARS = buildYears()

export default function KycPanel({ clientId, client, onStatusChange }) {
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [uploadingType, setUploadingType] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const [kycStatus, setKycStatus] = useState(client?.kyc_status || 'not_started')
  const [statusSaving, setStatusSaving] = useState(false)

  const [nominee, setNominee] = useState({
    nominee_name: client?.nominee_name || '',
    nominee_relation: client?.nominee_relation || '',
    nominee_dob_month: client?.nominee_dob ? new Date(client.nominee_dob).getMonth() + 1 : '',
    nominee_dob_year: client?.nominee_dob ? new Date(client.nominee_dob).getFullYear() : '',
    nominee_phone: client?.nominee_phone || '',
  })
  const [nomineeSaving, setNomineeSaving] = useState(false)
  const [nomineeSaved, setNomineeSaved] = useState(false)

  const [fatca, setFatca] = useState(client?.fatca_declaration || false)
  const [fatcaDeclaredAt, setFatcaDeclaredAt] = useState(client?.fatca_declared_at || null)
  const [fatcaSaving, setFatcaSaving] = useState(false)

  const loadDocs = useCallback(async () => {
    try {
      setDocsLoading(true)
      const data = await getKycDocuments(clientId)
      setDocs(data)
    } catch {
      // silently fail
    } finally {
      setDocsLoading(false)
    }
  }, [clientId])

  useEffect(() => { loadDocs() }, [loadDocs])

  const handleUpload = async (docType, file) => {
    setUploadingType(docType)
    try {
      const newDoc = await uploadKycDocument(clientId, file, docType)
      setDocs(prev => [...prev.filter(d => d.doc_type !== docType), newDoc])
      // Refresh status from server
      const updated = await updateKycStatus(clientId, kycStatus) // triggers auto-advance on server, but we need fresh
        .catch(() => null)
      // Reload docs to get fresh status
      await loadDocs()
      // Update displayed status by re-fetching client (via callback)
      if (onStatusChange) onStatusChange()
    } catch (err) {
      alert('Upload failed: ' + (err?.response?.data?.detail || err.message))
    } finally {
      setUploadingType(null)
    }
  }

  const handleDelete = async (docId) => {
    setDeletingId(docId)
    try {
      await deleteKycDocument(clientId, docId)
      setDocs(prev => prev.filter(d => d.id !== docId))
      setConfirmDeleteId(null)
    } catch {
      // silently fail
    } finally {
      setDeletingId(null)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setKycStatus(newStatus)
    setStatusSaving(true)
    try {
      await updateKycStatus(clientId, newStatus)
      if (onStatusChange) onStatusChange()
    } catch {
      // silently fail
    } finally {
      setStatusSaving(false)
    }
  }

  const handleNomineeSave = async () => {
    setNomineeSaving(true)
    try {
      let nominee_dob = null
      if (nominee.nominee_dob_month && nominee.nominee_dob_year) {
        nominee_dob = `${nominee.nominee_dob_year}-${String(nominee.nominee_dob_month).padStart(2, '0')}-01`
      }
      await updateNominee(clientId, {
        nominee_name: nominee.nominee_name || null,
        nominee_relation: nominee.nominee_relation || null,
        nominee_dob: nominee_dob,
        nominee_phone: nominee.nominee_phone || null,
      })
      setNomineeSaved(true)
      setTimeout(() => setNomineeSaved(false), 2000)
    } catch {
      // silently fail
    } finally {
      setNomineeSaving(false)
    }
  }

  const handleFatcaToggle = async (checked) => {
    setFatca(checked)
    setFatcaSaving(true)
    try {
      const result = await updateFatca(clientId, checked)
      setFatcaDeclaredAt(result.fatca_declared_at || null)
    } catch {
      setFatca(!checked) // revert on error
    } finally {
      setFatcaSaving(false)
    }
  }

  const handlePdfDownload = async () => {
    setPdfLoading(true)
    try {
      await downloadRiskPdf(clientId)
    } catch {
      alert('PDF generation failed.')
    } finally {
      setPdfLoading(false)
    }
  }

  const docByType = (type) => docs.find(d => d.doc_type === type)
  const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename || '')

  return (
    <div className="space-y-5 pb-8">

      {/* ── Section 1: KYC Status ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">KYC Status</h3>
          <KycStatusBadge status={kycStatus} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Override status</label>
          <select
            value={kycStatus}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={statusSaving}
            className="flex-1 min-w-[160px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {Object.entries(KYC_STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
          {statusSaving && <Loader2 size={14} className="animate-spin text-blue-500" />}
        </div>
        <p className="text-xs text-gray-400">Status auto-advances to <strong>Submitted</strong> when all 4 documents are uploaded.</p>
      </div>

      {/* ── Section 2: Nominee & FATCA ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Nominee & FATCA</h3>

        {/* Nominee form */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nominee Name</label>
            <input
              type="text"
              value={nominee.nominee_name}
              onChange={e => setNominee(n => ({ ...n, nominee_name: e.target.value }))}
              placeholder="Full legal name"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
            <select
              value={nominee.nominee_relation}
              onChange={e => setNominee(n => ({ ...n, nominee_relation: e.target.value }))}
              className={INPUT_CLS}
            >
              <option value="">Select relationship</option>
              {NOMINEE_RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={nominee.nominee_dob_month}
                onChange={e => setNominee(n => ({ ...n, nominee_dob_month: e.target.value }))}
                className={INPUT_CLS}
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select
                value={nominee.nominee_dob_year}
                onChange={e => setNominee(n => ({ ...n, nominee_dob_year: e.target.value }))}
                className={INPUT_CLS}
              >
                <option value="">Year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input
              type="tel"
              value={nominee.nominee_phone}
              onChange={e => setNominee(n => ({ ...n, nominee_phone: e.target.value }))}
              placeholder="+91 98765 43210"
              className={INPUT_CLS}
            />
          </div>
          <button
            onClick={handleNomineeSave}
            disabled={nomineeSaving}
            className="w-full py-2 bg-navy-950 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
          >
            {nomineeSaving ? <Loader2 size={14} className="animate-spin" /> : nomineeSaved ? <CheckCircle size={14} /> : null}
            {nomineeSaved ? 'Saved!' : 'Save Nominee'}
          </button>
        </div>

        {/* FATCA */}
        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={fatca}
              onChange={e => handleFatcaToggle(e.target.checked)}
              disabled={fatcaSaving}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
                FATCA Declaration
              </span>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                I confirm this client is NOT a US Person or foreign national requiring FATCA/CRS reporting.
              </p>
              {fatca && fatcaDeclaredAt && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  Declared on {new Date(fatcaDeclaredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            {fatcaSaving && <Loader2 size={14} className="animate-spin text-blue-500 mt-0.5" />}
          </label>
        </div>
      </div>

      {/* ── Section 3: Documents ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">KYC Documents</h3>
          {docsLoading && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {DOC_SLOTS.map(slot => {
            const existing = docByType(slot.type)
            const isUploading = uploadingType === slot.type
            const isDeleting = deletingId === (existing?.id)
            const pendingConfirm = confirmDeleteId === existing?.id

            return (
              <div key={slot.type} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{slot.label}</span>
                  {existing ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle size={12} /> Uploaded
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Not uploaded</span>
                  )}
                </div>

                {existing ? (
                  <div className="space-y-2">
                    {/* Preview */}
                    {isImage(existing.file_name) && existing.signed_url ? (
                      <img
                        src={existing.signed_url}
                        alt={slot.label}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg">
                        <FileText size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 truncate">{existing.file_name}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      Uploaded {new Date(existing.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <div className="flex gap-2">
                      {existing.signed_url && (
                        <a
                          href={existing.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors min-h-[36px]"
                        >
                          <Download size={12} /> View
                        </a>
                      )}
                      {pendingConfirm ? (
                        <div className="flex-1 flex gap-1">
                          <button
                            onClick={() => handleDelete(existing.id)}
                            disabled={isDeleting}
                            className="flex-1 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 min-h-[36px]"
                          >
                            {isDeleting ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 min-h-[36px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(existing.id)}
                          className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors min-h-[36px]"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {/* Re-upload option */}
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={e => e.target.files[0] && handleUpload(slot.type, e.target.files[0])}
                      />
                      {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      Replace
                    </label>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">{slot.hint}</p>
                    <label className={`flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                      isUploading
                        ? 'border-blue-200 text-blue-400 cursor-not-allowed bg-blue-50'
                        : 'border-gray-200 text-gray-600 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
                    }`}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={isUploading}
                        onChange={e => e.target.files[0] && handleUpload(slot.type, e.target.files[0])}
                      />
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {isUploading ? 'Uploading…' : 'Upload file'}
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 4: Risk Profile PDF ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Risk Profile PDF</h3>
        <p className="text-sm text-gray-600">
          Generate a downloadable risk profile report for <strong>{client?.name}</strong> based on their risk score and category.
        </p>
        <button
          onClick={handlePdfDownload}
          disabled={pdfLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-950 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {pdfLoading ? 'Generating PDF…' : 'Download Risk Profile PDF'}
        </button>
        <p className="text-xs text-gray-400 text-center">Document will be watermarked <em>Pending Signature</em> until advisor and client countersign.</p>
      </div>

    </div>
  )
}

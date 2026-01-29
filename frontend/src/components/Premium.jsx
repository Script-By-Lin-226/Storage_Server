import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Crown, CheckCircle2, Smartphone, CreditCard, Upload, ArrowLeft, ArrowRightCircle } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

const plansFallback = [
  {
    id: 'basic_free',
    name: 'Basic',
    priceLabel: '0 ks',
    price_ks: 0,
    storage_gb: 10,
    highlight: false,
    description: 'Perfect for getting started with secure cloud storage.',
    features: ['Up to 10 GB storage', 'Max file size 2 GB', 'Limited upload speed'],
  },
  {
    id: 'premium_100',
    name: 'Premium',
    priceLabel: '7,999 ks / month',
    price_ks: 7999,
    storage_gb: 100,
    highlight: true,
    description: 'Best choice for active users who need more space.',
    features: ['100 GB secure storage', 'Max file size 5 GB', 'Normal speed', 'Folder sharing & file links'],
  },
  {
    id: 'premium_plus_500',
    name: 'Premium Plus',
    priceLabel: '34,999 ks / month',
    price_ks: 34999,
    storage_gb: 500,
    highlight: false,
    description: 'For heavy users, teams, and large backups.',
    features: ['500 GB secure storage', 'Max file size 20 GB', 'High speed', 'Folder upload & download stats'],
  },
]

function Premium() {
  const navigate = useNavigate()
  const { dark } = useTheme()
  const { success, error } = useToast()

  const [plans, setPlans] = useState(plansFallback)
  const [selectedPlanId, setSelectedPlanId] = useState('premium_100')
  const [phone, setPhone] = useState('+95')
  const [paymentMethod, setPaymentMethod] = useState('KBZ_PAY')
  const [transcriptFile, setTranscriptFile] = useState(null)
  const [transcriptPreviewName, setTranscriptPreviewName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [purchases, setPurchases] = useState([])
  const [activePurchase, setActivePurchase] = useState(null)
    const [showAllPayments, setShowAllPayments] = useState(false)

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await axios.get('/premium/purchases')
        const list = res.data?.purchases || []
        setPurchases(list)
        const active = list.find((p) => p.is_active)
        setActivePurchase(active || null)
      } catch (e) {
        console.error('Failed to load purchases', e)
      }
    }

    const fetchPlans = async () => {
      try {
        const res = await axios.get('/premium/plans')
        if (Array.isArray(res.data) && res.data.length > 0) {
          // Map backend plans to UI meta
          const mapped = res.data.map((p) => {
            if (p.id === 'basic_free') {
              return {
                ...p,
                priceLabel: '0 ks',
                highlight: false,
                name: 'Basic',
                description: p.description || 'Perfect for getting started with secure cloud storage.',
                features: p.features || ['Up to 10 GB storage', 'Max file size 2 GB', 'Limited upload speed'],
              }
            }
            if (p.id === 'premium_100') {
              return {
                ...p,
                priceLabel: `${p.price_ks.toLocaleString()} ks / month`,
                highlight: true,
                name: 'Premium',
                description: p.description || 'Best choice for active users who need more space.',
                features:
                  p.features || [
                    '100 GB secure storage',
                    'Max file size 5 GB',
                    'Normal speed',
                    'Folder sharing & file links',
                  ],
              }
            }
            if (p.id === 'premium_plus_500') {
              return {
                ...p,
                priceLabel: `${p.price_ks.toLocaleString()} ks / month`,
                highlight: false,
                name: 'Premium Plus',
                description: p.description || 'For heavy users, teams, and large backups.',
                features:
                  p.features || [
                    '500 GB secure storage',
                    'Max file size 20 GB',
                    'High speed',
                    'Folder upload & download stats',
                  ],
              }
            }
            return {
              ...p,
              priceLabel: `${p.price_ks.toLocaleString()} ks`,
              highlight: false,
              description: p.description || '',
              features: [],
            }
          })
          setPlans(mapped)
        }
      } catch (e) {
        // Fallback to local config, no toast needed
        console.error('Failed to load premium plans', e)
      }
    }
    fetchPlans()
    fetchPurchases()
  }, [])

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[1] || plans[0]

  const handleTranscriptChange = (e) => {
    const file = e.target.files?.[0]
    setTranscriptFile(file || null)
    setTranscriptPreviewName(file ? file.name : '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!activePlan) {
      error('Please select a plan')
      return
    }
    if (!phone.startsWith('+95')) {
      error('Phone number must start with Myanmar code +95')
      return
    }
    if (!transcriptFile) {
      error('Please upload your payment transcript')
      return
    }

    const formData = new FormData()
    formData.append('plan_id', activePlan.id)
    formData.append('phone_msisdn', phone)
    formData.append('payment_method', paymentMethod)
    formData.append('transcript', transcriptFile)

    setSubmitting(true)
    try {
      await axios.post('/premium/purchase', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      success('Your premium request has been submitted. We will review your transcript.')
      setTranscriptFile(null)
      setTranscriptPreviewName('')
    } catch (err) {
      console.error(err)
      error(err.response?.data?.detail || 'Failed to submit premium purchase')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs sm:text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to dashboard</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
              Premium Storage Plans
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <section className="text-center space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Simple plans for every storage need
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-xs sm:text-sm">
            Start with the free plan, and upgrade to Premium or Pro when you need more space. Pay easily with KBZ Pay
            or Wave.
          </p>
        </section>

        {/* Current subscription summary */}
        {activePurchase && (
          <section className="grid gap-4 sm:gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-stretch sm:items-center">
            <div className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50/80 dark:bg-primary-900/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300 mb-1">
                  Active plan
                </p>
                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  {activePurchase.plan_name}{' '}
                  <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
                    ({activePurchase.storage_gb >= 1024 ? '1 TB' : `${activePurchase.storage_gb} GB`})
                  </span>
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  {activePurchase.expires_at
                    ? `Current cycle expires on ${new Date(activePurchase.expires_at).toLocaleDateString()}`
                    : 'No expiry date set yet'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
                <p className="text-[11px] text-emerald-50/90 sm:max-w-[200px] text-right">
                  Each approved package adds extra storage on top of your existing quota.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4 text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
              <p className="font-semibold text-gray-900 dark:text-white">Your payment history</p>
              {(showAllPayments ? purchases : purchases.slice(0, 3)).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 py-1">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100 truncate">
                      {p.plan_name}{' '}
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        ({p.storage_gb >= 1024 ? '1 TB' : `${p.storage_gb} GB`})
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {new Date(p.created_at).toLocaleDateString()} •{' '}
                      {p.status === 'approved'
                        ? 'Approved'
                        : p.status === 'rejected'
                        ? 'Rejected'
                        : 'Pending approval'}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-300 whitespace-nowrap">
                    {p.price_ks.toLocaleString()} ks
                  </span>
                </div>
              ))}
              {purchases.length > 3 && !showAllPayments && (
                <button
                  type="button"
                  onClick={() => setShowAllPayments(true)}
                  className="text-[11px] text-primary-600 dark:text-primary-300 mt-1 underline underline-offset-2"
                >
                  + {purchases.length - 3} more payments
                </button>
              )}
              {purchases.length > 3 && showAllPayments && (
                <button
                  type="button"
                  onClick={() => setShowAllPayments(false)}
                  className="text-[11px] text-primary-600 dark:text-primary-300 mt-1 underline underline-offset-2"
                >
                  Show less
                </button>
              )}
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={`relative group rounded-2xl border p-4 sm:p-6 text-left transition-all ${
                plan.id === selectedPlanId
                  ? 'border-primary-500 shadow-lg shadow-primary-500/10 bg-white dark:bg-gray-900'
                  : 'border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 hover:border-primary-400 hover:shadow-md'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-amber-500 text-xs font-semibold text-white shadow">
                  Popular
                </div>
              )}
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h2>
                {plan.id === 'free' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Included
                  </span>
                ) : (
                  <Crown
                    className={`w-5 h-5 ${
                      plan.highlight ? 'text-amber-500' : 'text-amber-400 dark:text-amber-500'
                    }`}
                  />
                )}
              </div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Storage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {plan.storage_gb >= 1024 ? '1 TB' : `${plan.storage_gb} GB`}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">{plan.priceLabel}</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 min-h-[32px] sm:min-h-[40px]">
                {plan.description}
              </p>
              <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                {plan.features?.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                <span
                  className={`text-xs font-medium ${
                    plan.id === selectedPlanId
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {plan.id === selectedPlanId ? 'Selected plan' : 'Click to select'}
                </span>
                <ArrowRightCircle
                  className={`w-5 h-5 ${
                    plan.id === selectedPlanId
                      ? 'text-primary-500'
                      : 'text-gray-400 group-hover:text-primary-500'
                  }`}
                />
              </div>
            </button>
          ))}
        </section>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-500" />
              Complete your purchase
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
              Upload your payment transcript after sending the amount via KBZ Pay or Wave. We’ll review and upgrade
              your storage.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Selected plan
              </label>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100">
                <span>{activePlan?.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {activePlan?.storage_gb >= 1024 ? '1 TB' : `${activePlan?.storage_gb} GB`} •{' '}
                  {activePlan?.price_ks
                    ? `${activePlan.price_ks.toLocaleString()} ks / month`
                    : 'Free (already active)'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Your phone number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="+959xxxxxxxxx"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Must start with <span className="font-mono font-semibold">+95</span>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Payment method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('KBZ_PAY')}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition ${
                    paymentMethod === 'KBZ_PAY'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  KBZ Pay
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('WAVE_PAY')}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition ${
                    paymentMethod === 'WAVE_PAY'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Wave Pay
                </button>
              </div>
              {paymentMethod && (
                <div className="mt-3 rounded-xl border border-primary-200 dark:border-primary-900/60 bg-primary-50/60 dark:bg-primary-900/20 px-3 py-4">
                  <p className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                    {paymentMethod === 'KBZ_PAY' ? 'KBZ Pay Transfer Account' : 'Wave Pay Transfer Account'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    09941549351 <span className="text-xs font-medium text-gray-600 dark:text-gray-300">(Lynn Lynn Aung)</span>
                  </p>
                  <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                    After transfer, upload your transcript and submit for admin approval.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Payment transcript
              </label>
              <label className="flex items-center gap-2 w-full px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300">
                <Upload className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="flex-1 truncate">
                  {transcriptPreviewName || 'Upload screenshot or PDF of your payment'}
                </span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleTranscriptChange} />
              </label>
              {transcriptPreviewName && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Preview: <span className="font-medium">{transcriptPreviewName}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !activePlan || activePlan.price_ks === 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : activePlan.price_ks === 0 ? (
                <span>You are already on the Free plan</span>
              ) : (
                <>
                  <span>Submit payment transcript</span>
                  <ArrowRightCircle className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 p-4 sm:p-6 text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">How it works</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm">
              <li>Select your preferred plan above.</li>
              <li>Send the payment from your KBZ Pay or Wave Pay account.</li>
              <li>Upload the payment transcript here and submit.</li>
              <li>We verify and then upgrade your storage quota. Your purchases will appear in your dashboard.</li>
            </ol>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Your transcript is stored securely and will only be visible in your dashboard when you open the purchase
              details. If no transcript is uploaded, nothing will be shown.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Premium


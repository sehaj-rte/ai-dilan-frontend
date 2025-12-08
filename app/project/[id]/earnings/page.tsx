'use client'

import React, { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, History, AlertCircle } from "lucide-react"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { API_URL } from "@/lib/config"
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client"
import { useParams } from "next/navigation"

interface SubscriptionRecord {
  id: string
  plan_id: string
  plan_name: string
  amount: number
  currency: string
  status: string
  started_at: string
  ended_at: string | null
  user_name?: string | null
  user_email?: string | null
}

interface PlanItem {
  id: string
  name: string
  price: number
  currency: string
  billing_interval: string
}

interface SubscriptionSummary {
  total_subscribers: number
  active_subscriptions: number
  canceled_subscriptions: number
}

export default function SubscriptionHistoryPage() {
  const params = useParams()
  const projectId = params.id as string

  const { toasts, removeToast, success, error } = useToast()

  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([])
  const [selected, setSelected] = useState<SubscriptionRecord | null>(null)
  const [cancelModal, setCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [replaceModal, setReplaceModal] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)
  const [plans, setPlans] = useState<PlanItem[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)

  // Fetch subscription history
  const fetchSubscriptions = async () => {
    try {
      setLoading(true)

      const response = await fetchWithAuth(
        `${API_URL}/payments/subscriptions/experts/${projectId}`,
        { headers: getAuthHeaders() }
      )

      const data = await response.json()

      if (data.success) {
        setSubscriptions(data.subscriptions || [])
        setSummary(data.summary || null)
      } else {
        error(data.detail || "Failed to fetch subscription history")
      }
    } catch (e) {
      console.error(e)
      error("Error loading subscription history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [projectId])

  // Open replace modal: preload expert plans
  const openReplaceModal = async (record: SubscriptionRecord) => {
    try {
      setSelected(record)
      setReplaceModal(true)
      // Fetch expert plans to populate dropdown
      const resp = await fetchWithAuth(
        `${API_URL}/plans/experts/${projectId}`,
        { headers: getAuthHeaders() }
      )
      const data = await resp.json()
      if (data.success) {
        const mapped: PlanItem[] = (data.plans || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          currency: p.currency,
          billing_interval: p.billing_interval,
        }))
        setPlans(mapped)
        // Prefill with a different plan than current, if available
        const alt = mapped.find((p) => p.id !== record.plan_id)
        setSelectedPlanId(alt ? alt.id : (mapped[0]?.id || ""))
      } else {
        error(data.detail || "Failed to load plans")
      }
    } catch (e) {
      console.error(e)
      error("Error loading plans")
    }
  }

  // Replace subscription now
  const handleReplaceSubscription = async () => {
    if (!selected || !selectedPlanId) return
    try {
      setIsReplacing(true)
      const response = await fetchWithAuth(
        `${API_URL}/payments/subscriptions/${selected.id}/replace`,
        {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ new_plan_id: selectedPlanId })
        }
      )
      const data = await response.json()
      if (data.success) {
        // If Stripe requires checkout, redirect the user
        if (data.use_checkout && data.checkout_url) {
          success("Redirecting to Stripe to complete the replacement…")
          window.location.href = data.checkout_url
          return
        }
        success("Subscription replaced successfully")
        setReplaceModal(false)
        setSelected(null)
        await fetchSubscriptions()
      } else {
        error(data.detail || "Failed to replace subscription")
      }
    } catch (e) {
      console.error(e)
      error("Error replacing subscription")
    } finally {
      setIsReplacing(false)
    }
  }

  // Cancel a subscription
  const handleCancelSubscription = async () => {
    if (!selected) return

    try {
      setIsCancelling(true)

      const response = await fetchWithAuth(
        `${API_URL}/payments/subscriptions/${selected.id}/cancel`,
        { method: "POST", headers: getAuthHeaders() }
      )

      const data = await response.json()

      if (data.success) {
        success("Subscription cancelled successfully")
        fetchSubscriptions()
      } else {
        error(data.detail || "Failed to cancel subscription")
      }
    } catch (e) {
      console.error(e)
      error("Error cancelling subscription")
    } finally {
      setIsCancelling(false)
      setCancelModal(false)
      setSelected(null)
    }
  }

  return (
    <DashboardLayout>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <History className="w-6 h-6 mr-3 text-blue-600" />
            Subscription History
          </h1>
          <p className="text-gray-600 mt-1">
            View all subscription records for this expert.
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Subscribers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_subscribers}</div>
              </CardContent>
            </Card>
            <Card className="shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.active_subscriptions}</div>
              </CardContent>
            </Card>
            <Card className="shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Cancelled Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-700">{summary.canceled_subscriptions}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Subscription Records</CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                No subscription history found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr className="text-left">
                      <th className="p-3">Subscriber</th>
                      <th className="p-3">Plan</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Start Date</th>
                      <th className="p-3">End Date</th>
                      {/* <th className="p-3">Actions</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{sub.user_name || "—"}</div>
                          <div className="text-xs text-gray-500">{sub.user_email || ""}</div>
                        </td>
                        <td className="p-3 font-medium">{sub.plan_name}</td>
                        <td className="p-3">
                          {sub.currency} {sub.amount}
                        </td>
                        <td className="p-3 capitalize">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              sub.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {new Date(sub.started_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {sub.ended_at
                            ? new Date(sub.ended_at).toLocaleDateString()
                            : "—"}
                        </td>
                        {/* <td className="p-3 space-x-2">
                          <Button
                            variant="secondary"
                            onClick={() => openReplaceModal(sub)}
                            disabled={sub.status !== "active" && sub.status !== "trialing"}
                          >
                            Replace plan
                          </Button>
                        </td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel Confirmation Modal */}
      <Dialog open={cancelModal} onOpenChange={setCancelModal}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the subscription for{" "}
            <strong>{selected?.plan_name}</strong>? This action cannot be undone.
          </DialogDescription>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelModal(false)}
              disabled={isCancelling}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Plan Modal */}
      <Dialog open={replaceModal} onOpenChange={setReplaceModal}>
        <DialogContent className="max-w-md">
          <DialogTitle>Replace Subscription Plan</DialogTitle>
          <DialogDescription>
            Select a new plan for the subscriber. The current subscription will be canceled and a new one will be created.
          </DialogDescription>

          <div className="mt-4 space-y-2">
            <label className="text-sm text-gray-600">New Plan</label>
            <select
              className="w-full border rounded p-2"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.currency} {p.price} / {p.billing_interval}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceModal(false)} disabled={isReplacing}>
              Close
            </Button>
            <Button onClick={handleReplaceSubscription} disabled={isReplacing || !selectedPlanId}>
              {isReplacing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Replace now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

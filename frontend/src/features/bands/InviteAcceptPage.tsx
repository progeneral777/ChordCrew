import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { bandsApi, apiErrorMessage } from '../../api/bands'

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const accepted = useRef(false)

  useEffect(() => {
    if (!token || accepted.current) return
    accepted.current = true
    bandsApi
      .acceptInvite(token)
      .then((res) => navigate(`/bands/${res.data.data.band.id}`, { replace: true }))
      .catch((err) => setError(apiErrorMessage(err, '接受邀請失敗')))
  }, [token, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-600 mb-4">{error}</p>
            <Link to="/" className="text-blue-600 hover:underline text-sm">
              回樂團列表
            </Link>
          </>
        ) : (
          <p className="text-gray-500">加入樂團中…</p>
        )}
      </div>
    </div>
  )
}

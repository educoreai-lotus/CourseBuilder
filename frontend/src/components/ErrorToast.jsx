export default function ErrorToast({ message, onClose }) {
  if (!message) return null
  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-md shadow">
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="underline">Dismiss</button>
      </div>
    </div>
  )
}



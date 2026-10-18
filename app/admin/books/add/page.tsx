import { redirect } from 'next/navigation'

export default function AddBookPage() {
  redirect('/books?action=add')
}
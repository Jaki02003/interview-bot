import { auth } from '@/auth'
import SignupForm from '@/components/signup-form'
import { Session } from '@/lib/types'
import { redirect } from 'next/navigation'

export default async function SignupPage() {
  return (
    <main className="flex flex-col p-4">
      <SignupForm />
    </main>
  )
}

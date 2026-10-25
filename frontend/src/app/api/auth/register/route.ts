import { exchange } from '../credentials'

export async function POST(request: Request) {
  return exchange('/api/auth/register', request)
}

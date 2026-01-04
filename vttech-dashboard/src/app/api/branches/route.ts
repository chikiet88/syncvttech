import prisma from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      where: {
        is_active: 1
      },
      orderBy: {
        name: 'asc'
      }
    })
    return NextResponse.json(branches)
  } catch (error) {
    console.error("[BRANCHES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

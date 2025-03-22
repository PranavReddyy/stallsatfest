// app/api/admin/login/route.js
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sign } from 'jsonwebtoken'

export async function POST(request) {
    try {
        const { username, password } = await request.json()

        // In production, validate against database
        // This is just for demo
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            // Create JWT token
            const token = sign(
                { username },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            )

            // Set secure cookie
            cookies().set({
                name: 'adminToken',
                value: token,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 8, // 8 hours
                path: '/',
            })

            return NextResponse.json({ success: true })
        }

        return NextResponse.json(
            { success: false, message: 'Invalid credentials' },
            { status: 401 }
        )
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        )
    }
}
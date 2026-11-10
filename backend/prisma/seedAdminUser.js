/**
 * Seed AdminUser table with initial SUPERADMIN
 * Run: node prisma/seedAdminUser.js
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function seedAdminUser() {
  try {
    // Check if superadmin already exists
    const existing = await prisma.adminUser.findFirst({
      where: {
        OR: [{ email: 'admin@mesitra.id' }, { email: 'admin@myrent.com' }]
      }
    })

    if (existing) {
      if (existing.email === 'admin@myrent.com') {
        await prisma.adminUser.update({
          where: { id: existing.id },
          data: { email: 'admin@mesitra.id' }
        })
      }
      console.log('✓ Superadmin already exists: admin@mesitra.id')
      return
    }

    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin#Sewa2026'
    const passwordHash = await bcrypt.hash(adminPassword, 10)

    const superadmin = await prisma.adminUser.create({
      data: {
        email: 'admin@mesitra.id',
        passwordHash,
        name: 'Super Administrator Mesitra',
        role: 'SUPERADMIN',
        isActive: true
      }
    })

    console.log('✓ Created SUPERADMIN:', superadmin.email)
    console.log('  Email: admin@mesitra.id')
    console.log('  Password:', adminPassword)
    console.log('  Role: SUPERADMIN')
  } catch (error) {
    console.error('Error seeding AdminUser:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedAdminUser()

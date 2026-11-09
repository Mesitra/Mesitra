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
      where: { email: 'admin@myrent.com' }
    })

    if (existing) {
      console.log('✓ Superadmin already exists:', existing.email)
      return
    }

    // Create superadmin
    const passwordHash = await bcrypt.hash('admin123', 10)
    
    const superadmin = await prisma.adminUser.create({
      data: {
        email: 'admin@myrent.com',
        passwordHash,
        name: 'Super Administrator',
        role: 'SUPERADMIN',
        isActive: true
      }
    })

    console.log('✓ Created SUPERADMIN:', superadmin.email)
    console.log('  Email: admin@myrent.com')
    console.log('  Password: admin123')
    console.log('  Role: SUPERADMIN')
  } catch (error) {
    console.error('Error seeding AdminUser:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedAdminUser()

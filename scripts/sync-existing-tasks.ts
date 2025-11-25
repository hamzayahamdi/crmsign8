/**
 * Script de migration pour synchroniser les tâches existantes avec le calendrier
 * À utiliser si vous avez des tâches créées AVANT l'implémentation de cette fonctionnalité
 * 
 * Usage:
 * - Copier ce fichier dans scripts/
 * - Exécuter: npx ts-node scripts/sync-existing-tasks.ts
 * 
 * Cela créera un CalendarEvent pour chaque Task qui n'en a pas déjà un
 */

import { PrismaClient } from '@prisma/client'
import { format } from 'date-fns'

const prisma = new PrismaClient()

async function migrateExistingTasks() {
  console.log('🔄 Début de la synchronisation des tâches existantes...\n')

  try {
    // Récupérer tous les admins
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true }
    })

    const adminIds = admins.map(admin => admin.id)
    console.log(`✅ ${admins.length} admin(s) trouvé(s)`)
    console.log(`   IDs: ${adminIds.join(', ')}\n`)

    // Récupérer toutes les tâches
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'asc' }
    })

    console.log(`📋 ${tasks.length} tâche(s) trouvée(s)\n`)

    let successCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Pour chaque tâche, créer un événement calendrier
    for (const task of tasks) {
      try {
        // Vérifier si un événement existe déjà pour cette tâche
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            title: `[TÂCHE] ${task.title}`,
            linkedLeadId: task.linkedType === 'lead' ? task.linkedId : null,
            linkedClientId: task.linkedType === 'client' ? task.linkedId : null
          }
        })

        if (existingEvent) {
          console.log(`⏭️  SKIPPED: Task "${task.title}" - Événement existe déjà`)
          skippedCount++
          continue
        }

        // Vérifier que le lead/client existe
        let entityExists = false
        if (task.linkedType === 'lead') {
          const lead = await prisma.lead.findUnique({
            where: { id: task.linkedId }
          })
          entityExists = !!lead
        } else if (task.linkedType === 'client') {
          const client = await prisma.client.findUnique({
            where: { id: task.linkedId }
          })
          entityExists = !!client
        }

        if (!entityExists) {
          console.log(`❌ ERROR: Task "${task.title}" - ${task.linkedType} not found`)
          errorCount++
          continue
        }

        // Récupérer l'utilisateur assigné
        const assignedUser = await prisma.user.findFirst({
          where: { name: task.assignedTo },
          select: { id: true }
        })

        if (!assignedUser) {
          console.log(`❌ ERROR: Task "${task.title}" - Assigned user not found`)
          errorCount++
          continue
        }

        // Préparer les participants
        const participants: string[] = [assignedUser.id]
        adminIds.forEach(adminId => {
          if (!participants.includes(adminId)) {
            participants.push(adminId)
          }
        })

        // Créer l'événement
        const startDate = new Date(task.dueDate)
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // +1 heure

        // Get creator user ID if available
        let creatorId = task.createdBy
        const creator = await prisma.user.findFirst({
          where: { name: task.createdBy },
          select: { id: true }
        })
        if (creator) {
          creatorId = creator.id
        }

        const eventData: any = {
          title: task.title,
          description: task.description,
          startDate,
          endDate,
          eventType: 'suivi_projet',
          assignedTo: assignedUser.id, // Use user ID
          participants,
          visibility: 'team',
          createdBy: creatorId
        }

        if (task.linkedType === 'lead') {
          eventData.linkedLeadId = task.linkedId
        } else {
          eventData.linkedClientId = task.linkedId
        }

        await prisma.calendarEvent.create({
          data: eventData
        })

        console.log(`✅ SUCCESS: Task "${task.title}" - Événement créé`)
        console.log(`   Assigné à: ${task.assignedTo}`)
        console.log(`   Date: ${format(new Date(task.dueDate), 'dd/MM/yyyy HH:mm')}`)
        successCount++
      } catch (error: any) {
        console.log(`❌ ERROR: Task "${task.title}" - ${error?.message}`)
        errorCount++
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 RÉSUMÉ DE LA MIGRATION')
    console.log('='.repeat(60))
    console.log(`✅ Réussis: ${successCount}`)
    console.log(`⏭️  Ignorés: ${skippedCount}`)
    console.log(`❌ Erreurs: ${errorCount}`)
    console.log(`📋 Total: ${tasks.length}`)
    console.log('='.repeat(60))

    if (successCount > 0) {
      console.log(`\n🎉 ${successCount} tâche(s) ont été synchronisée(s) avec le calendrier!`)
    } else {
      console.log(`\n⚠️ Aucune tâche n'a pu être synchronisée.`)
    }
  } catch (error: any) {
    console.error('💥 Erreur fatale lors de la migration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter la migration
migrateExistingTasks().catch(console.error)

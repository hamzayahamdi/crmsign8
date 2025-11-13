import type { Task, TaskStatus } from '@/types/task'

const API_BASE = '/api/tasks'

interface TasksResponse {
  success: boolean
  data: Task[]
  count: number
}

interface TaskFilters {
  assignedTo?: string
  status?: TaskStatus | 'all'
  linkedType?: 'lead' | 'client' | 'all'
}

export class TasksService {
  // Get all tasks with optional filters
  static async getTasks(filters?: TaskFilters): Promise<Task[]> {
    try {
      const url = new URL(API_BASE, window.location.origin)
      
      if (filters?.assignedTo && filters.assignedTo !== 'all') {
        url.searchParams.set('assignedTo', filters.assignedTo)
      }
      if (filters?.status && filters.status !== 'all') {
        url.searchParams.set('status', filters.status)
      }
      if (filters?.linkedType && filters.linkedType !== 'all') {
        url.searchParams.set('linkedType', filters.linkedType)
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(url.toString(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const result: TasksResponse = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error fetching tasks:', error)
      throw error
    }
  }

  // Get a specific task
  static async getTask(id: string): Promise<Task> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`${API_BASE}/${id}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch task')
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error fetching task:', error)
      throw error
    }
  }

  // Create a new task
  static async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(task),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  // Update a task
  static async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    try {
      const url = `${API_BASE}/${id}`
      const body = { id, ...task }
      console.log('[TasksService] updateTask - URL:', url, 'Body:', body)
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })

      console.log('[TasksService] updateTask - Response status:', response.status)
      
      if (!response.ok) {
        let msg = 'Failed to update task'
        try { 
          const err = await response.json()
          console.error('[TasksService] updateTask - Error response:', err)
          msg = err?.error || msg 
        } catch {}
        throw new Error(msg)
      }

      const result = await response.json()
      console.log('[TasksService] updateTask - Success:', result)
      return result.data
    } catch (error) {
      console.error('[TasksService] updateTask - Exception:', error)
      throw error
    }
  }

  // Delete a task
  static async deleteTask(id: string): Promise<void> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        let message = 'Failed to delete task'
        try {
          const errorBody = await response.json()
          if (errorBody?.error) {
            message = errorBody.error
          }
        } catch {
          // Ignore JSON parsing errors (e.g. empty body)
        }

        if (response.status === 404) {
          console.warn('[TasksService] Task already removed on server, ignoring 404.')
          return
        }

        throw new Error(message)
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  // Get tasks assigned to a specific user
  static async getMyTasks(userName: string): Promise<Task[]> {
    return this.getTasks({ assignedTo: userName })
  }

  // Get tasks by status
  static async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    return this.getTasks({ status })
  }

  // Update task status only
  static async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    console.log('[TasksService] updateTaskStatus called:', { id, status, hasId: !!id })
    if (!id) {
      console.error('[TasksService] Missing id in updateTaskStatus!')
      throw new Error('Missing task id')
    }
    return this.updateTask(id, { status })
  }
}

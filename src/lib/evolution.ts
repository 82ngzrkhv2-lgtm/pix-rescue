const EVOLUTION_URL = import.meta.env.DEV ? '/evolution-api' : import.meta.env.VITE_EVOLUTION_API_URL
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY

export const evolutionApi = {
  baseUrl: EVOLUTION_URL,
  apiKey: EVOLUTION_KEY,

  async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${EVOLUTION_URL}${path}`, {
      ...options,
      headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }))
      throw new Error(error.message || `HTTP ${res.status}`)
    }
    return res.json()
  },

  /** Cria uma instância para o usuário */
  async createInstance(instanceName: string) {
    return this.request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({ instanceName, qrcode: true }),
    })
  },

  /** Busca QR Code da instância */
  async getQrCode(instanceName: string) {
    return this.request(`/instance/connect/${instanceName}`)
  },

  /** Status de conexão */
  async getConnectionState(instanceName: string) {
    return this.request(`/instance/connectionState/${instanceName}`)
  },

  /** Desconectar instância */
  async logout(instanceName: string) {
    return this.request(`/instance/logout/${instanceName}`, { method: 'DELETE' })
  },

  /** Reconectar */
  async reconnect(instanceName: string) {
    return this.request(`/instance/connect/${instanceName}`)
  },

  /** Enviar mensagem de texto */
  async sendText(instanceName: string, phone: string, text: string) {
    return this.request(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: phone,
        options: { delay: 1200 },
        textMessage: { text },
      }),
    })
  },

  /** Deletar instância */
  async deleteInstance(instanceName: string) {
    return this.request(`/instance/delete/${instanceName}`, { method: 'DELETE' })
  },
}

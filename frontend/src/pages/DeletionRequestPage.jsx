import React, { useState } from 'react';
import api from '../api/client';

export default function DeletionRequestPage() {
  const [formData, setFormData] = useState({
    requester_name: '',
    requester_contact: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/deletion-requests', formData);
      setSubmitted(true);
      setFormData({
        requester_name: '',
        requester_contact: '',
        reason: '',
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Erro ao enviar solicitação. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Solicitar Remoção de Dados
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Se você não deseja que seus dados apareçam em nosso serviço, preencha o formulário abaixo.
          Avaliaremos sua solicitação e, se aprovada, seus dados serão removidos permanentemente.
        </p>

        {submitted ? (
          <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6">
            <h2 className="font-semibold text-green-800">Solicitação Enviada</h2>
            <p className="mt-2 text-sm text-green-700">
              Obrigado por sua solicitação. Nossa equipe entrará em contato em breve para confirmar.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
            >
              Enviar Outro
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="requester_name" className="block text-sm font-medium text-gray-700">
                Nome da Empresa *
              </label>
              <input
                type="text"
                id="requester_name"
                name="requester_name"
                value={formData.requester_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Seu negócio"
              />
            </div>

            <div>
              <label htmlFor="requester_contact" className="block text-sm font-medium text-gray-700">
                Telefone ou Email *
              </label>
              <input
                type="text"
                id="requester_contact"
                name="requester_contact"
                value={formData.requester_contact}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="seu-telefone@email.com"
              />
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                Motivo da Solicitação *
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                rows="5"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Explique por que deseja remover seus dados..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="font-semibold text-gray-900">Sobre Seus Dados</h3>
        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          <li>
            • Coletamos informações públicas de seu negócio (nome, endereço, telefone, website, redes sociais).
          </li>
          <li>
            • Esses dados são usados para conectar vendedores a oportunidades em seu segmento.
          </li>
          <li>
            • Se não deseja aparecer em nossa plataforma, podemos remover seus dados permanentemente.
          </li>
          <li>
            • A remoção pode levar até 90 dias após a aprovação de sua solicitação.
          </li>
        </ul>
      </div>
    </div>
  );
}

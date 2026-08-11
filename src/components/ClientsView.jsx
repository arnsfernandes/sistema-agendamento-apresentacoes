export default function ClientsView({
  filteredClients,
  clientSearchTerm,
  setClientSearchTerm
}) {
  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Clientes</h1>
        <p className="view-description">Lista de clientes e contatos comerciais consolidados a partir dos agendamentos.</p>
      </div>

      <div className="client-search-wrapper">
        <div className="search-input-container">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="search-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
          </svg>
          <input
            type="text"
            className="client-search-input"
            placeholder="Pesquisar por nome, telefone ou agência..."
            value={clientSearchTerm}
            onChange={(e) => setClientSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="clients-table-container">
        {filteredClients.length > 0 ? (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Agência</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.telefone}>
                  <td>
                    <span className="client-table-name">{client.nome}</span>
                  </td>
                  <td>
                    <span className="client-table-phone">{client.telefone}</span>
                  </td>
                  <td>
                    {client.agencia ? (
                      <span className="client-table-agency">{client.agencia}</span>
                    ) : (
                      <span className="client-table-agency-empty">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-clients-found">
            <p>Nenhum cliente encontrado para os termos da busca.</p>
          </div>
        )}
      </div>
    </div>
  )
}

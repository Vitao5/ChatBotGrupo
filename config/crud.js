
// Conexão com o banco de Dados
const bd = require('bd.js').conectarBd(); 

// Cria uma nova tarefa
function criarTarefa(titulo, tipo, descricao, datadeentrega, quemCriou) {
  // Validação básica dos dados de entrada
  if (!titulo || !tipo || !descricao || !datadeentrega || !quemCriou) {
    return "Erro no envio de Dados" + titulo + tipo + descricao + datadeentrega + quemCriou;
  }

  // Insere a nova tarefa no banco de dados
  bd.query('INSERT INTO tarefas (titulo, tipo, descricao, datadeentrega, quemCriou) VALUES (?, ?, ?, ?, ?)', [titulo, tipo, descricao, datadeentrega, quemCriou], (error) => {
    if (error) {
      return 'Erro ao registrar a tarefa' + error;
    }
    return 'Tarefa registrada com sucesso';
  });
}

// Deleta uma tarefa específica pelo ID e criador
function deletarTarefa(id, quemCriou) {
  // Validação do ID e do criador
  if (!id || !quemCriou) {
    return "Id ou quemCriou não está passando" + id + quemCriou;
  }

  // Remove a tarefa do banco de dados
  bd.query('DELETE FROM tarefas WHERE id = ? AND quemCriou = ?', [id, quemCriou], (error, results) => {
    if (error) {
      return 'Erro ao deletar a tarefa' + id + error;
    }
    return 'Tarefa ' + id + ' deletada com sucesso';
  });
}

// Deleta tarefas com um título específico e de um criador
function deletarPorTitulo(titulo, quemCriou) {
  // Validação do título e do criador
  if (!titulo || !quemCriou) {
    return "Título ou quemCriou não fornecido para deleção" + titulo + quemCriou;
  }
  // Remove tarefas do banco de dados pelo título e criador
  bd.query('DELETE FROM tarefas WHERE titulo = ? AND quemCriou = ?', [titulo, quemCriou], (error, results) => {
    if (error) {
      return 'Erro ao deletar tarefa por título' + error;
    }
    return 'Tarefa com título "' + titulo + '" deletada com sucesso (se pertencia a ' + quemCriou + ')';
  });
}

// Seleciona todas as tarefas existentes
function selecionarTarefas() {
  // Busca todas as tarefas no banco de dados
  bd.query('SELECT id, titulo, tipo, descricao, datadeentrega, quemCriou FROM tarefas', (error, results) => {
    if (error) {
      return 'Erro ao selecionar as tarefas' + error;
    }
    return 'Tarefas:' + results;
  });
}

// Edita uma tarefa (implementação atual apenas seleciona tarefas)
function editarTarefa() {
  // Atualmente, esta função busca todas as tarefas (similar a selecionarTarefas)
  bd.query('SELECT id, titulo, tipo, descricao, datadeentrega, quemCriou FROM tarefas', (error, results) => {
    if (error) {
      return 'Erro ao selecionar as tarefas' + error;
    }
    return 'Tarefas:' + results;
  });
}

// Seleciona tarefas por um título específico e de um criador
function selecionarTarefaPorTitulo(titulo, quemCriou) {
  // Validação do título e do criador
  if (!titulo || !quemCriou) {
    return "Título ou quemCriou inválido ou não fornecido para a busca.";
  }
  // Busca tarefas no banco de dados pelo título e criador
  bd.query('SELECT id, titulo, tipo, descricao, datadeentrega, quemCriou FROM tarefas WHERE titulo = ? AND quemCriou = ?', [titulo, quemCriou], (error, results) => {
    if (error) {
      return "Erro ao selecionar dados" + error;
    }
    return "Tarefas" + results;
  });
}

// Seleciona tarefas por data de entrega e de um criador
function selecionarTarefaPorData(datadeentrega, quemCriou) {
  // Validação da data e do criador
  if (!datadeentrega || !quemCriou) {
    return "Data ou quemCriou inválida ou não fornecida para a busca.";
  }
  // Busca tarefas no banco de dados pela data de entrega e criador
  bd.query('SELECT id, titulo, tipo, descricao, datadeentrega, quemCriou FROM tarefas WHERE datadeentrega = ? AND quemCriou = ?', [datadeentrega, quemCriou], (error, results) => {
    if (error) {
      return "Erro ao selecionar dados" + error;
    }
    return "Tarefas:" + results;
  });
}

// Seleciona tarefas por tipo e de um criador
function selecionarTarefaPorTipo(tipo, quemCriou) {
  // Validação do tipo e do criador
  if (!tipo || !quemCriou) {
    return "Tipo ou quemCriou inválido ou não fornecido para a busca.";
  }
  // Busca tarefas no banco de dados pelo tipo e criador
  bd.query('SELECT id, titulo, tipo, descricao, datadeentrega, quemCriou FROM tarefas WHERE tipo = ? AND quemCriou = ?', [tipo, quemCriou], (error, results) => {
    if (error) {
      return "Erro ao selecionar dados" + error;
    }
    return "Tarefas:" + results;
  });
}

// Exporta todas as funções para serem usadas em outros módulos
module.exports = {
  criarTarefa,
  deletarTarefa,
  deletarPorTitulo,
  selecionarTarefas,
  editarTarefa,
  selecionarTarefaPorTitulo,
  selecionarTarefaPorData,
  selecionarTarefaPorTipo
};
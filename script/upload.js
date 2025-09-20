// script.js
// Lê o arquivo do <input type="file">, converte para Base64 (DataURL)
// e injeta um campo oculto "arquivo64" no <form>. O envio vai para um <iframe>
// e o backend responde via postMessage sem recarregar a página.

document.addEventListener('DOMContentLoaded', () => {
  // ===== Configurações (devem bater com o backend) =====
  const TAMANHO_MAX_MB = 10;

  // Inclui variantes reais vistas em alguns ambientes (ex.: *-sequence)
  const TIPOS_PERMITIDOS = [
    'image/jpeg', 'image/png', 'image/webp',
    'image/heic', 'image/heif',
    'image/heic-sequence', 'image/heif-sequence'
  ];

  // ===== Referências ao DOM =====
  const formularioEnvio      = document.getElementById('formulario_envio');
  const campoArquivo         = document.getElementById('arquivo');           // input file (sem name!)
  const campoConsentimento   = document.getElementById('consentimento');     // checkbox com name="consentimento"
  const botaoEnviar          = document.getElementById('botao_enviar');
  const paragrafoMensagem    = document.getElementById('mensagem');

  // ===== Utils =====

  // Cria/atualiza um <input type="hidden" name="<nome>"> dentro do formulário
  function criarOuAtualizarOculto(nome, valor) {
    let inputOculto = formularioEnvio.querySelector(`input[type="hidden"][name="${nome}"]`);
    if (!inputOculto) {
      inputOculto = document.createElement('input');
      inputOculto.type = 'hidden';
      inputOculto.name = nome;
      formularioEnvio.appendChild(inputOculto);
    }
    inputOculto.value = valor;
    return inputOculto;
  }

  // Mapeia extensão -> MIME (fallback quando File.type vier vazio/incorreto)
  function mimePorExtensao(nomeArquivo) {
    const n = (nomeArquivo || '').toLowerCase();
    if (/\.(jpe?g)$/.test(n)) return 'image/jpeg';
    if (/\.png$/.test(n))     return 'image/png';
    if (/\.webp$/.test(n))    return 'image/webp';
    if (/\.heic$/.test(n))    return 'image/heic';
    if (/\.heif$/.test(n))    return 'image/heif';
    return null;
  }

  // Valida se o arquivo é permitido por MIME OU por extensão (fallback)
  function fotoPermitida(file) {
    const tipo = (file.type || '').toLowerCase();
    const mimeExt = mimePorExtensao(file.name);

    // Se o tipo já é um dos permitidos, ok
    if (TIPOS_PERMITIDOS.includes(tipo)) return true;

    // Se o tipo veio vazio/estranho, mas a extensão é reconhecida, também ok
    if (!tipo && mimeExt) return true;

    // Se o tipo não está na lista, mas a extensão mapeia para um MIME permitido, ok
    if (mimeExt && TIPOS_PERMITIDOS.includes(mimeExt)) return true;

    return false;
  }

  // ===== Envio do formulário =====
  formularioEnvio.addEventListener('submit', (evento) => {
    evento.preventDefault(); // impede envio imediato para prepararmos o Base64
    paragrafoMensagem.textContent = '';
    paragrafoMensagem.className = 'mensagem';

    const arquivo = campoArquivo.files[0];
    if (!arquivo) {
      paragrafoMensagem.textContent = 'Selecione um arquivo.';
      paragrafoMensagem.classList.add('erro');
      return;
    }
    if (!fotoPermitida(arquivo)) {
      paragrafoMensagem.textContent = 'Tipo de arquivo não permitido. Use JPG, PNG, WEBP, HEIC ou HEIF.';
      paragrafoMensagem.classList.add('erro');
      return;
    }
    if (arquivo.size > TAMANHO_MAX_MB * 1024 * 1024) {
      paragrafoMensagem.textContent = `Arquivo excede ${TAMANHO_MAX_MB} MB.`;
      paragrafoMensagem.classList.add('erro');
      return;
    }
    if (!campoConsentimento.checked) {
      paragrafoMensagem.textContent = 'Marque o consentimento para continuar.';
      paragrafoMensagem.classList.add('erro');
      return;
    }

    botaoEnviar.disabled = true;
    paragrafoMensagem.textContent = 'Preparando arquivo...';

    // Converte a imagem para DataURL Base64 (ex.: "data:image/jpeg;base64,AAAA...")
    const leitor = new FileReader();
    leitor.onload = () => {
      let dataURL = leitor.result;

      // Alguns ambientes geram 'data:application/octet-stream;base64,...' ou 'data:;base64,...'
      if (/^data:(?:application\/octet-stream|);base64,/i.test(dataURL)) {
        const mimeInf = mimePorExtensao(arquivo.name);
        if (mimeInf) {
          dataURL = dataURL.replace(/^data:(?:application\/octet-stream|);base64,/i, `data:${mimeInf};base64,`);
        }
      }

      // Cria/atualiza o campo oculto que o backend espera
      criarOuAtualizarOculto('arquivo64', dataURL);

      paragrafoMensagem.textContent = 'Enviando...';
      // Envia o form (a resposta voltará no iframe "janela_envio")
      formularioEnvio.submit();
    };
    leitor.onerror = () => {
      botaoEnviar.disabled = false;
      paragrafoMensagem.textContent = 'Falha ao ler o arquivo.';
      paragrafoMensagem.classList.add('erro');
    };
    leitor.readAsDataURL(arquivo);
  });

  // ===== Resposta do backend (via postMessage no <iframe>) =====
  window.addEventListener('message', (evento) => {
    const dados = evento.data || {};
    botaoEnviar.disabled = false;

    if (dados.ok) {
      paragrafoMensagem.textContent = 'Foto enviada! Ela está na fila de moderação.';
      paragrafoMensagem.className = 'mensagem ok';
      // Limpa o formulário e remove o hidden "arquivo64" (higiene)
      formularioEnvio.reset();
      const oculto = formularioEnvio.querySelector('input[type="hidden"][name="arquivo64"]');
      if (oculto) oculto.remove();
    } else {
      paragrafoMensagem.textContent = 'Erro: ' + (dados.error || 'Falha ao enviar.');
      paragrafoMensagem.className = 'mensagem erro';
    }
  });
});

import 'dotenv/config';
import { consultar, consultarUm, emTransacao, executar, pool } from '../lib/db.js';

/**
 * Popula o banco com uma base fictícia de demonstração: clientes de
 * várias UFs, catálogo com imagens, 60 dias de pedidos distribuídos
 * entre os canais e atendimentos já registrados.
 *
 * Todos os dados são claramente inventados — nenhum CPF, e-mail ou
 * telefone corresponde a pessoa real.
 */

type LinhaCliente = [string, string, string, string, string, string, string, string];
type LinhaProduto = [string, string, string, number, number, string, string];

const CLIENTES: LinhaCliente[] = [
  ['Ana Beatriz Machado',  'ana.machado@email.com',    '52998224725', '(48) 99812-4455', '1995-04-12', 'Florianópolis', 'SC', 'ativo'],
  ['Carlos Eduardo Ramos', 'carlos.ramos@email.com',   '87748248800', '(48) 99745-1122', '1988-11-03', 'São José',      'SC', 'ativo'],
  ['Mariana Duarte Lopes', 'mariana.lopes@email.com',  '11144477735', '(11) 98877-2211', '1992-07-21', 'São Paulo',     'SP', 'ativo'],
  ['Rafael Souza Prado',   'rafael.prado@email.com',   '39053344705', '(21) 99655-8877', '1990-01-30', 'Rio de Janeiro','RJ', 'ativo'],
  ['Juliana Ferreira Sá',  'juliana.sa@email.com',     '12345678909', '(48) 99333-4400', '1998-09-15', 'Palhoça',       'SC', 'ativo'],
  ['Bruno Almeida Neves',  'bruno.neves@email.com',    '15350946056', '(51) 99122-3344', '1985-03-08', 'Porto Alegre',  'RS', 'ativo'],
  ['Patrícia Gomes Lima',  'patricia.lima@email.com',  '40364631000', '(41) 99988-1234', '1993-12-25', 'Curitiba',      'PR', 'prospect'],
  ['Diego Martins Rocha',  'diego.rocha@email.com',    '71428793860', '(31) 99777-5566', '1991-06-17', 'Belo Horizonte','MG', 'ativo'],
  ['Letícia Barbosa Cruz', 'leticia.cruz@email.com',   '35524052000', '(48) 99456-7788', '2000-02-09', 'Florianópolis', 'SC', 'ativo'],
  ['Marcelo Tavares Pinto','marcelo.pinto@email.com',  '19100000000', '(48) 99111-2233', '1979-08-14', 'Biguaçu',       'SC', 'inativo'],
  ['Fernanda Ribeiro Dias','fernanda.dias@email.com',  '48254935070', '(85) 99444-3322', '1996-05-27', 'Fortaleza',     'CE', 'ativo'],
  ['Thiago Nunes Carvalho','thiago.carvalho@email.com','29537995000', '(48) 99222-9911', '1994-10-02', 'Florianópolis', 'SC', 'prospect'],
];

const PRODUTOS: LinhaProduto[] = [
  ['HDS-4200', 'Headset Profissional HD 4200',   'Áudio',        459.90,  38, '/assets/produtos/headset.svg', 'Headset binaural com cancelamento de ruído, homologado para operações de call center.'],
  ['MIC-USB-9', 'Microfone USB Studio 9',        'Áudio',        329.00,  22, '/assets/produtos/microfone.svg', 'Microfone condensador com padrão cardioide, ideal para gravação de prompts de URA.'],
  ['TEL-IP-500','Telefone IP Executive 500',     'Telefonia',    899.00,  15, '/assets/produtos/telefone-ip.svg', 'Terminal SIP com display colorido, PoE e suporte a 6 contas simultâneas.'],
  ['GTW-VOIP-8','Gateway VoIP 8 Portas',         'Telefonia',   2740.00,   6, '/assets/produtos/gateway-voip.svg', 'Gateway analógico de 8 portas FXS para integração de ramais legados.'],
  ['SW-POE-24', 'Switch Gerenciável PoE 24p',    'Redes',       3190.00,   9, '/assets/produtos/switch-poe.svg', 'Switch camada 2+ com 24 portas PoE+ e uplinks SFP de 10G.'],
  ['RTR-MESH-6','Roteador Mesh Tri-Band AX6',    'Redes',        899.90,  27, '/assets/produtos/roteador-mesh.svg', 'Sistema mesh Wi-Fi 6 com cobertura de até 300 m² por unidade.'],
  ['MON-27-QHD','Monitor 27" QHD IPS',           'Periféricos', 1499.00,  18, '/assets/produtos/monitor.svg', 'Painel IPS 2560x1440, 100 Hz, com hub USB-C de 65 W.'],
  ['KB-MEC-TKL','Teclado Mecânico TKL Silent',   'Periféricos',  389.90,  44, '/assets/produtos/teclado.svg', 'Switches silenciosos, layout ABNT2 e construção em alumínio.'],
  ['CAM-4K-PRO','Webcam 4K Conference Pro',      'Vídeo',       1249.00,  12, '/assets/produtos/webcam.svg', 'Webcam 4K com enquadramento automático e microfone de longo alcance.'],
  ['BAR-VC-100','Barra de Videoconferência 100', 'Vídeo',       5890.00,   4, '/assets/produtos/barra-video.svg', 'Solução all-in-one para salas de reunião de até 12 pessoas.'],
  ['NBK-i7-16', 'Notebook Corporativo i7 16GB',  'Computadores',6790.00,   7, '/assets/produtos/notebook.svg', 'Intel Core i7, 16 GB RAM, SSD 512 GB e TPM 2.0 para ambiente corporativo.'],
  ['DOCK-USB-C','Dock Station USB-C 12 em 1',    'Periféricos',  749.00,   0, '/assets/produtos/dock.svg', 'Replicador de portas com dupla saída de vídeo 4K e Ethernet gigabit.'],
  ['NOB-1500VA','Nobreak Senoidal 1500VA',       'Energia',     1890.00,  11, '/assets/produtos/nobreak.svg', 'Nobreak senoidal puro com 8 tomadas e autonomia estendida.'],
  ['SRV-RACK-1','Servidor Rack 1U Xeon',         'Computadores',18900.00,  3, '/assets/produtos/servidor-rack.svg', 'Servidor 1U com Xeon Silver, 64 GB ECC e redundância de fonte.'],
  ['FONE-BT-PR','Fone Bluetooth Pro ANC',        'Áudio',        699.00,  31, '/assets/produtos/fone-bluetooth.svg', 'Fone over-ear com ANC híbrido e 40 h de bateria.'],
];

const CANAIS = ['site', 'site', 'site', 'chatbot', 'chatbot', 'ura', 'whatsapp', 'telefone'] as const;
const STATUS = ['entregue', 'entregue', 'enviado', 'pago', 'pago', 'aguardando_pagamento', 'cancelado'] as const;

const sortear = <T,>(lista: readonly T[]): T => lista[Math.floor(Math.random() * lista.length)]!;
const inteiro = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function semear(): Promise<void> {
  console.log('🌱 Populando o banco...');

  await executar(
    'TRUNCATE pedido_itens, pedidos, atendimentos, produtos, clientes RESTART IDENTITY CASCADE',
  );

  // --- clientes ---
  const clientes: string[] = [];
  for (const [nome, email, cpf, telefone, nascimento, cidade, uf, status] of CLIENTES) {
    const linha = await consultarUm<{ id: string }>(
      `INSERT INTO clientes (nome, email, cpf, telefone, data_nascimento, cidade, uf, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW() - (random() * INTERVAL '120 days'))
       RETURNING id`,
      [nome, email, cpf, telefone, nascimento, cidade, uf, status],
    );
    if (linha) clientes.push(linha.id);
  }
  console.log(`   ✓ ${clientes.length} clientes`);

  // --- produtos ---
  const produtos: Array<{ id: string; preco: number }> = [];
  for (const [sku, nome, categoria, preco, estoque, imagem, descricao] of PRODUTOS) {
    const linha = await consultarUm<{ id: string; preco: number }>(
      `INSERT INTO produtos (sku, nome, categoria, preco, estoque, imagem, descricao)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, preco`,
      [sku, nome, categoria, preco, estoque, imagem, descricao],
    );
    if (linha) produtos.push(linha);
  }
  console.log(`   ✓ ${produtos.length} produtos`);

  // --- pedidos dos últimos 60 dias ---
  const elegiveis = clientes.slice(0, 11);   // o cliente inativo fica de fora
  let totalPedidos = 0;

  for (let i = 0; i < 46; i += 1) {
    const diasAtras = inteiro(0, 59);
    await emTransacao(async (client) => {
      const { rows: [pedido] } = await client.query<{ id: string }>(
        `INSERT INTO pedidos (cliente_id, canal, status, created_at)
         VALUES ($1, $2, $3, NOW() - ($4 || ' days')::interval) RETURNING id`,
        [sortear(elegiveis), sortear(CANAIS), sortear(STATUS), diasAtras],
      );
      if (!pedido) return;

      const escolhidos = new Set<{ id: string; preco: number }>();
      for (let j = 0; j < inteiro(1, 3); j += 1) escolhidos.add(sortear(produtos));

      for (const produto of escolhidos) {
        await client.query(
          `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [pedido.id, produto.id, inteiro(1, 3), produto.preco],
        );
      }
    });
    totalPedidos += 1;
  }
  console.log(`   ✓ ${totalPedidos} pedidos com itens`);

  // --- atendimentos de exemplo ---
  const transcrever = (linhas: Array<[string, string]>): string =>
    JSON.stringify(linhas.map(([autor, texto]) => ({ autor, texto, em: new Date().toISOString() })));

  await executar(
    `INSERT INTO atendimentos (protocolo, cliente_id, canal, status, no_atual, transcript, created_at) VALUES
     ($1, $2, 'ura', 'resolvido', 'encerrar', $3::jsonb, NOW() - INTERVAL '2 days'),
     ($4, $5, 'chatbot', 'transferido', 'transferir', $6::jsonb, NOW() - INTERVAL '1 day'),
     ($7, NULL, 'chatbot', 'resolvido', 'encerrar', $8::jsonb, NOW() - INTERVAL '4 hours')`,
    [
      'AT-DEMO-0001', clientes[0],
      transcrever([['bot', 'Olá! Você ligou para a Elo Commerce.'], ['cliente', '1'],
                   ['bot', 'Digite o número do seu pedido.'], ['cliente', '3'],
                   ['bot', 'Pedido nº 3 está a caminho.'], ['cliente', '0'],
                   ['bot', 'Obrigado por falar com a Elo Commerce.']]),
      'AT-DEMO-0002', clientes[2],
      transcrever([['bot', 'Olá! Em que posso ajudar?'], ['cliente', 'quero falar com um atendente'],
                   ['bot', 'Certo! Estou transferindo você para um especialista.']]),
      'AT-DEMO-0003',
      transcrever([['bot', 'Olá! Em que posso ajudar?'], ['cliente', 'tem alguma promoção?'],
                   ['bot', 'Nossas melhores ofertas: Microfone USB Studio 9 por R$ 329,00...'],
                   ['cliente', 'valeu'], ['bot', 'Obrigado por falar com a Elo Commerce.']]),
    ],
  );
  console.log('   ✓ 3 atendimentos');

  const resumo = await consultarUm<{ faturamento: number }>(
    `SELECT COALESCE(SUM(total), 0) AS faturamento FROM pedidos WHERE status <> 'cancelado'`,
  );
  console.log(`\n✅ Base pronta — faturamento simulado: ${
    Number(resumo?.faturamento ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }`);
}

semear()
  .catch((erro: Error) => {
    console.error('❌ Falha no seed:', erro.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

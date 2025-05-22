const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");

const { default: OpenAI } = require("openai");

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3978;
const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;

const server = app.listen(PORT, () => {
  console.log(`\nBot iniciado e escutando na porta ${PORT}`);
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = req.query["hub.verify_token"];

  if (mode && verifyToken) {
    if (mode === "subscribe" && verifyToken === mytoken) {
      console.log("Verificação de webhook bem-sucedida");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }

  res.sendStatus(400);
});

app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (
    body.object &&
    body.entry &&
    body.entry[0].changes &&
    body.entry[0].changes[0].value.messages &&
    body.entry[0].changes[0].value.messages[0]
  ) {
    const value = body.entry[0].changes[0].value;
    const phoneNumberId = value.metadata.phone_number_id;
    const from = tratarNumeroBrasileiro(value.messages[0].from);
    const msgBody = value.messages[0].text.body;

    const cliente = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })
    
    const modelo = "gpt-4o-mini";

    const url = "https://zenthos.com.br/system/api/QCLmi1UVW45wVzPWbgxKTtRgEkiJkZ51BrAA6xSC8PPtr4UECHXOZmoIcZDFZyVk93";

    console.log("Mensagem recebida:", msgBody);

    try {

      // const response = await fetch(url);
      // console.log("Response:", response);
      // const data = await response.json();
      // console.log("Data:", data);

      //   const dados = data.map(item => 
      //     `Pergunta: ${item.pergunta} Resposta: ${item.resposta}`
      //   ).join("\n");

      //   const prompt_sistema = `
      //   Seu nome é Claudete. Você é uma especialista do setor de Recursos Humanos de uma empresa que ajuda a esclarecer as dúvidas das pessoas sobre férias, folha de pagamento, benefícios e outras questões relacionadas a área de Recursos Humanos.
      //   Você pode utilizar como base para elaborar a melhor resposta a lista abaixo.
      //   Escreva um parágrafo com menos de 50 palavras resumindo a resposta mais adequada para a pergunta: ${msgBody}.
        
      //   # Lista de Respostas
      //   ${dados}
        
      //   # Formato da Saída
      //   [Utilize uma linguagem simples para as respostas]
      // `;

      const dados = `
        - A empresa não permite vender férias.
        - É permitido separar as férias das seguintes maneiras: 3 vezes de 10 dias, 2 vezes de 15 dias ou 30 dias.
        - Precisa solicitar as férias no portal do RH.
        - As férias devem ser solicitadas com 30 dias de antecedência.
        - O pagamento referente as férias ocorre em até 2 dias úteis antes do início de descanso.
        - Em caso de falta no trabalho, o colaborador precisa apresentar um atestado médico, caso contrário será descontado do pagamento o período que esteve ausente.
        - O empregado tem direito, anualmente, ao gozo de um período de férias de 30 dias.
        - O período será sempre de 30 dias? Não, isso depende de quantas faltas injustificadas o empregado teve durante o período aquisitivo de férias. Veja a tabela de dias de férias de acordo com as faltas: 
        - 30 (trinta) dias corridos, quando não houver faltado ao serviço mais de 5 (cinco) vezes.
        - 24 (vinte e quatro) dias corridos, quando houver tido de 6 (seis) a 14 (quatorze) faltas.
        - 18 (dezoito) dias corridos, quando houver tido de 15 (quinze) a 23 (vinte e três) faltas.
        - 12 (doze) dias corridos, quando houver tido de 24 (vinte e quatro) a 32 (trinta e duas) faltas.
        As faltas justificadas por atestado médico ou qualquer das hipóteses previstas em lei, não são levadas em consideração para fins de contagem do período de descanso.
        - Quando serão concedidas as férias ao empregado? Para que o empregado tenha direito a tirar férias, é preciso cumprir um período chamado de período aquisitivo que corresponde a 12 meses de trabalho.
        - Após trabalhar 12 meses, o trabalhador cumpriu o período aquisitivo e entra automaticamente no período concessivo de 12 meses que o empregador tem para conceder as férias. Resumindo: Depois que o empregado completar 12 meses de trabalho, o empregador terá os 12 meses seguintes para conceder o descanso do trabalhador.
        - O período de descanso remunerado deve ser anotado na carteira de trabalho do empregado? Sim. Inclusive, o empregado só poderá entrar de férias depois que a anotação tiver devidamente concluída.
        - Parentes que trabalham na mesma empresa podem tirar férias juntos? Sim. A lei assegura que, se assim quiserem, membros da mesma família tirem férias juntos, desde que isso não traga prejuízos ao serviço.
        `;

        const prompt_sistema = `
        Seu nome é Claudete. Você é uma especialista do setor de Recursos Humanos de uma empresa que ajuda a esclarecer as dúvidas das pessoas sobre férias, folha de pagamento, benefícios e outras questões relacionadas a área de Recursos Humanos.
        Você pode utilizar como base para elaborar a melhor resposta a lista abaixo.
        Escreva um parágrafo com menos de 50 palavras resumindo a resposta mais adequada para a pergunta: ${msgBody}.
        
        # Lista de Respostas
        ${dados}
        
        # Formato da Saída
        [Utilize uma linguagem simples para as respostas]
      `;

      console.log("Prompt:", prompt_sistema);

      const resposta = await cliente.chat.completions.create({
        model: modelo,
        messages: [
          { role: 'system', content: prompt_sistema },
          { role: 'user', content: msgBody },
        ],
        temperature: 0.2,
        max_tokens: 100,
      });

      console.log("Resposta:", resposta.choices[0].message.content);

      await axios({
        method: "POST",
        url: `https://graph.facebook.com/v22.0/${phoneNumberId}/messages?access_token=${token}`,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: { body: resposta.choices[0].message.content },
        },
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Mensagem respondida com sucesso");
      res.sendStatus(200);
    } catch (error) {
      console.error("Erro ao enviar resposta:", error.response?.data || error.message);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(404);
  }
});

app.get("/webhook/menu", (req, res) => {
  res.status(200).send("Webhook is working");
});

const tratarNumeroBrasileiro = (numero) => {
  // Remove todos os caracteres não numéricos
  const limpo = numero.replace(/\D/g, '');

  // Verifica se é um número brasileiro com DDI 55 e DDD (total 12 dígitos sem o 9)
  if (/^55\d{10}$/.test(limpo)) {
    const ddd = limpo.slice(2, 4);
    const primeiroDigito = limpo[4];

    // Adiciona o 9 apenas se ainda não tiver
    if (primeiroDigito !== '9') {
      return limpo.slice(0, 4) + '9' + limpo.slice(4);
    }
  }

  // Se já tiver o 9 ou não for número BR válido, retorna como está
  return limpo;
}
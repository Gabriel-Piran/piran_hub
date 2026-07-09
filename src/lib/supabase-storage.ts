import { supabaseAdmin } from "./supabase";

export async function ensureBuckets() {
  const supabase = supabaseAdmin();
  
  const bucketsToCreate = [
    { name: "midias", public: true, fileSizeLimit: 50 * 1024 * 1024 },
    { name: "mensagens-rapidas", public: true, fileSizeLimit: 50 * 1024 * 1024 },
  ];

  for (const bucket of bucketsToCreate) {
    try {
      // Verifica se o bucket já existe para evitar erro
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) {
        console.error("Erro ao listar buckets:", listError.message);
        continue;
      }
      
      const exists = buckets.some((b) => b.id === bucket.name);
      if (!exists) {
        const { error: createError } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
        });
        if (createError) {
          console.error(`Erro ao criar o bucket ${bucket.name}:`, createError.message);
        } else {
          console.log(`Bucket ${bucket.name} criado com sucesso.`);
        }
      }
    } catch (e: any) {
      console.error(`Exceção ao garantir o bucket ${bucket.name}:`, e?.message);
    }
  }
}

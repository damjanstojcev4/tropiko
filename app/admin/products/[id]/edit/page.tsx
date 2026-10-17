import { EditProductPage } from "@/components/admin/admin";
export default async function EditProduct({params}:{params:Promise<{id:string}>}){const {id}=await params;return <EditProductPage id={id}/>}

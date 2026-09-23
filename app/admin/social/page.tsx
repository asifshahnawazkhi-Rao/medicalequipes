"use client";

import { FormEvent, useEffect, useState } from "react";
import { getStoredSession, getSupabaseConfig, type AuthSession } from "../../auth";
import styles from "./page.module.css";

type SocialPost = { id:string; post_type:string; title:string; image_url:string; facebook_status:string; instagram_status:string; schedule_status?:string; scheduled_at?:string|null; created_at:string };
type PublishResult = { error?:string; facebook:{status:string;postId?:string;error?:string}; instagram:{status:string;postId?:string;error?:string} };

async function api(path:string, session:AuthSession, init:RequestInit={}) {
  const {url,key}=getSupabaseConfig(); const headers=new Headers(init.headers);
  headers.set("apikey",key); headers.set("Authorization",`Bearer ${session.access_token}`);
  if(init.body&&typeof init.body==="string") headers.set("Content-Type","application/json");
  const response=await fetch(`${url}${path}`,{...init,headers}); const text=await response.text(); const data=text?JSON.parse(text):null;
  if(!response.ok) throw new Error(data?.message||data?.error||"Supabase request failed."); return data;
}

export default function AdminSocialPage(){
  const [posts,setPosts]=useState<SocialPost[]>([]); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [preview,setPreview]=useState(""); const [mode,setMode]=useState<"now"|"schedule">("now");
  useEffect(()=>{const session=getStoredSession(); if(!session){location.replace("/");return;} api(`/rest/v1/profiles?select=role&id=eq.${session.user?.id}&limit=1`,session).then((rows)=>{if(String(rows?.[0]?.role||"").toLowerCase()!=="admin") location.replace("/dashboard"); else api("/rest/v1/social_posts?select=*&order=created_at.desc&limit=100",session).then(setPosts).catch(()=>setPosts([]));}).catch(()=>location.replace("/"));},[]);

  async function publish(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); const session=getStoredSession(); if(!session)return; const form=event.currentTarget; const data=new FormData(form); const file=data.get("image") as File; const fb=data.get("facebook")==="yes"; const ig=data.get("instagram")==="yes";
    if(!file?.size){setError("Please select an image.");return;} if(!fb&&!ig){setError("Select Facebook, Instagram, or both.");return;}
    let scheduledAt=""; if(mode==="schedule"){const value=String(data.get("scheduledAt")||""); const date=new Date(value); if(!value||Number.isNaN(date.getTime())||date.getTime()<Date.now()+5*60*1000){setError("Schedule the post at least 5 minutes from now.");return;} scheduledAt=date.toISOString();}
    try{
      setBusy(true);setError("");setMessage("Uploading image..."); const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"); const path=`${session.user!.id}/social/${Date.now()}-${safe}`;
      await api(`/storage/v1/object/listing-images/${path}`,session,{method:"POST",headers:{"Content-Type":file.type,"x-upsert":"false"},body:file}); const {url}=getSupabaseConfig(); const imageUrl=`${url}/storage/v1/object/public/listing-images/${path}`;
      const base={created_by:session.user!.id,post_type:data.get("postType"),title:data.get("title"),caption:data.get("caption"),image_url:imageUrl,website_url:data.get("websiteUrl")||null,publish_facebook:fb,publish_instagram:ig};
      if(mode==="schedule"){
        setMessage("Saving scheduled post..."); const saved=await api("/rest/v1/social_posts?select=*",session,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({...base,facebook_status:fb?"scheduled":"not_selected",instagram_status:ig?"scheduled":"not_selected",schedule_status:"scheduled",scheduled_at:scheduledAt})}); setPosts((old)=>[saved[0],...old]); setMessage(`Post scheduled for ${new Date(scheduledAt).toLocaleString("en-PK")}.`);
      }else{
        setMessage("Publishing..."); const response=await fetch("/api/facebook/publish-social",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({title:data.get("title"),caption:data.get("caption"),websiteUrl:data.get("websiteUrl"),imageUrl,publishFacebook:fb,publishInstagram:ig})}); const result=await response.json() as PublishResult; if(!response.ok)throw new Error(result.error||"Publishing failed.");
        const record={...base,facebook_status:result.facebook.status,instagram_status:result.instagram.status,facebook_post_id:result.facebook.postId||null,instagram_post_id:result.instagram.postId||null,facebook_error:result.facebook.error||null,instagram_error:result.instagram.error||null,schedule_status:"published",published_at:new Date().toISOString()}; try{const saved=await api("/rest/v1/social_posts?select=*",session,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(record)});setPosts((old)=>[saved[0],...old]);}catch{}
        setMessage(`${fb?`Facebook: ${result.facebook.status}`:""}${fb&&ig?" · ":""}${ig?`Instagram: ${result.instagram.status}`:""}`); if(result.facebook.status==="failed"||result.instagram.status==="failed")setError([result.facebook.error,result.instagram.error].filter(Boolean).join(" "));
      }
      form.reset();setPreview("");setMode("now");
    }catch(caught){setMessage("");setError(caught instanceof Error?caught.message:"Publishing failed.");}finally{setBusy(false);}
  }

  return <main className={styles.page}><header><a href="/admin">← Admin Dashboard</a><div><span>ADMIN SOCIAL CENTER</span><h1>Social Media Posts</h1><p>Create once and publish to Facebook and Instagram.</p></div></header>{message&&<div className={styles.success}>{message}</div>}{error&&<div className={styles.error}>{error}</div>}
    <section className={styles.card}><form onSubmit={publish}><label>Post type<select name="postType"><option value="technology">New Medical Technology</option><option value="event">Event Announcement</option><option value="marketing">Marketing / Promotion</option><option value="news">Industry News</option><option value="general">General Update</option></select></label><label>Post title *<input name="title" required maxLength={180}/></label><label className={styles.full}>Caption / details *<textarea name="caption" required maxLength={1900} rows={7}/></label><label>Website link<input name="websiteUrl" type="url" placeholder="https://www.medicalequipes.com"/></label><label>Post image *<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(e)=>{const f=e.target.files?.[0];setPreview(f?URL.createObjectURL(f):"");}}/></label>{preview&&<img className={styles.preview} src={preview} alt="Preview"/>}<fieldset><legend>Publish on</legend><label><input name="facebook" type="checkbox" value="yes" defaultChecked/> Facebook</label><label><input name="instagram" type="checkbox" value="yes" defaultChecked/> Instagram</label></fieldset><fieldset className={styles.publishTiming}><legend>Publishing time</legend><label><input type="radio" name="publishMode" checked={mode==="now"} onChange={()=>setMode("now")}/> Publish now</label><label><input type="radio" name="publishMode" checked={mode==="schedule"} onChange={()=>setMode("schedule")}/> Schedule</label></fieldset>{mode==="schedule"&&<label className={styles.scheduleField}>Schedule date & time *<input name="scheduledAt" type="datetime-local" required/><small>Time will follow your device timezone.</small></label>}<button className={styles.submitButton} disabled={busy}>{busy?(mode==="schedule"?"Scheduling...":"Publishing..."):(mode==="schedule"?"Schedule Post":"Publish Now")}</button></form></section>
    <section className={styles.history}><h2>Publishing History</h2>{posts.map(post=><article key={post.id}><img src={post.image_url} alt=""/><div><small>{post.post_type.replaceAll("_"," ")}</small><strong>{post.title}</strong><span>{post.schedule_status==="scheduled"&&post.scheduled_at?`Scheduled: ${new Date(post.scheduled_at).toLocaleString("en-PK")}`:new Date(post.created_at).toLocaleString("en-PK")}</span></div><div><b className={post.facebook_status==="published"?styles.ok:post.facebook_status==="scheduled"?styles.scheduled:styles.bad}>Facebook: {post.facebook_status}</b><b className={post.instagram_status==="published"?styles.ok:post.instagram_status==="scheduled"?styles.scheduled:styles.bad}>Instagram: {post.instagram_status}</b></div></article>)}{!posts.length&&<p>No saved social posts yet.</p>}</section>
  </main>;
}
